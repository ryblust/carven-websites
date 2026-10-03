#!/usr/bin/env python3
"""Build the pinned Carven compiler for the browser without a native execution driver.

The compiler checkout is read only. Sources, the one portability overlay, BMIs,
and object files live in a fresh temporary directory. Downloads are cached under
.site/; the public compiler assets and license notices are published on success.
"""

import argparse
import concurrent.futures
import hashlib
import json
import os
import pathlib
import platform
import re
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request

REVISION = '6d477cd14863f3d394196afde02b0dd9493a618e'
SOURCE_SHA256 = '215aa92854f3c645206409d9bd54002f8bf4f695dfff420745797dfc399b6f3e'
SDK_VERSION = '34.0'
SDK_HASHES = {
    'arm64-macos': '9c59398106b417f8f14913380fdf0097a8cc0ff4af9eb3ce0065a859e88d49e9',
    'arm64-linux': 'f7e243dff54d60bcc576e94d6166b69f410f2500ae4a9ceef34315be10e77971',
    'x86_64-linux': 'b761e3a0721dbae9c09a0059e5fdb2bf917d1b4a8a7b430fb3b5aafb0984b2c4',
}
HERE = pathlib.Path(__file__).resolve().parent
SITE = HERE.parent.parent
LOCK = json.loads((HERE / 'llvm-module-lock.json').read_text())


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def download(url, destination, expected=None):
    if destination.exists() and (expected is None or sha256(destination) == expected):
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(destination.suffix + '.partial')
    print('Downloading', url, flush=True)
    with urllib.request.urlopen(url, timeout=120) as response, partial.open('wb') as output:
        shutil.copyfileobj(response, output)
    if expected is not None and sha256(partial) != expected:
        partial.unlink()
        raise RuntimeError('Download checksum mismatch: ' + url)
    partial.replace(destination)


def extract(archive, directory):
    with tarfile.open(archive) as content:
        for member in content.getmembers():
            path = pathlib.PurePosixPath(member.name)
            if path.is_absolute() or '..' in path.parts:
                raise RuntimeError('Unsafe archive path')
            if member.issym() or member.islnk():
                target = pathlib.PurePosixPath(member.linkname)
                if target.is_absolute() or '..' in target.parts:
                    raise RuntimeError('Unsafe archive link')
        content.extractall(directory)


def toolchain(cache, supplied):
    if supplied:
        sdk = supplied.resolve()
    else:
        arch = {'aarch64': 'arm64', 'arm64': 'arm64', 'x86_64': 'x86_64'}.get(platform.machine())
        system = {'Darwin': 'macos', 'Linux': 'linux'}.get(platform.system())
        key = f'{arch}-{system}'
        if key not in SDK_HASHES:
            raise RuntimeError('Unsupported build host; use a supported WASI SDK 34 host')
        name = f'wasi-sdk-{SDK_VERSION}-{key}'
        archive = cache / (name + '.tar.gz')
        download(f'https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-34/{archive.name}', archive, SDK_HASHES[key])
        sdk = cache / name
        if not (sdk / 'bin/clang++').exists():
            extract(archive, cache)
    version = subprocess.check_output([str(sdk / 'bin/clang++'), '--version'], text=True)
    if LOCK['commit'] not in version or '23.1.0-wasi-sdk' not in version:
        raise RuntimeError('The supplied SDK is not the pinned WASI SDK 34 compiler')
    return sdk


def standard_module(cache, supplied, jobs):
    if supplied:
        root = supplied.resolve()
    else:
        root = cache / ('llvm-module-' + LOCK['commit'])
        base = f"https://raw.githubusercontent.com/llvm/llvm-project/{LOCK['commit']}/libcxx/modules/"
        template = root / 'std.cppm.in'
        download(base + 'std.cppm.in', template, LOCK['templateSha256'])

        def fragment(item):
            name, digest = item
            download(base + f'std/{name}.inc', root / f'std/{name}.inc', digest)

        with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:
            list(pool.map(fragment, LOCK['files'].items()))
        includes = '\n'.join(f'#include "std/{name}.inc"' for name in LOCK['files'])
        (root / 'std.cppm').write_text(template.read_text().replace('@LIBCXX_MODULE_STD_INCLUDE_SOURCES@', includes))
    if sha256(root / 'std.cppm') != LOCK['moduleSha256']:
        raise RuntimeError('Standard-library module checksum mismatch')
    for name, digest in LOCK['files'].items():
        if sha256(root / f'std/{name}.inc') != digest:
            raise RuntimeError('Standard-library export checksum mismatch: ' + name)
    return root / 'std.cppm'


def sources(work, cache, repository):
    root = work / 'compiler'
    root.mkdir()
    if repository:
        archive = work / 'compiler.tar'
        with archive.open('wb') as output:
            subprocess.run(['git', '-C', str(repository.resolve()), 'archive', REVISION], stdout=output, check=True)
        extract(archive, root)
    else:
        archive = cache / f'carven-{REVISION}.tar.gz'
        download(f'https://github.com/ryblust/carven/archive/{REVISION}.tar.gz', archive, SOURCE_SHA256)
        extract(archive, work)
        extracted = work / ('carven-' + REVISION)
        root.rmdir()
        extracted.rename(root)
    return root


def build(root, work, sdk, std, jobs):
    output = work / 'objects'
    output.mkdir()
    compiler = str(sdk / 'bin/clang++')
    flags = [compiler, '--target=wasm32-wasip1', '-std=c++26', '-fno-exceptions',
             '-mexception-handling', '-D_WASI_EMULATED_SIGNAL', '-fno-rtti', '-Oz', '-DNDEBUG']
    excluded = {'src/carven.cpp', 'src/driver/process.cpp', 'src/driver/run.cpp', 'src/driver/cli.cpp'}
    files = sorted(root.glob('src/**/*.cppm')) + sorted(root.glob('src/**/*.cpp'))
    files = [p for p in files if p.relative_to(root).as_posix() not in excluded]
    files.append(HERE / 'browser-main.cpp')
    # libc++'s WASI ABI uses a wrapped std::array iterator. Preserve its type.
    original = root / 'src/semantic/analysis/types/types.cpp'
    before = 'const auto* found = std::ranges::find(names, name,'
    after = 'const auto found = std::ranges::find(names, name,'
    source = original.read_text()
    if source.count(before) != 1:
        raise RuntimeError('Pinned iterator portability overlay no longer applies exactly')
    portable = work / 'types-portable.cpp'
    portable.write_text(source.replace(before, after))
    files[files.index(original)] = portable
    interfaces = {}
    for path in files:
        if path.suffix == '.cppm':
            name = re.search(r'^(?:export )?module ([\w:.]+);', path.read_text(), re.M).group(1)
            interfaces[name] = path
    maps = {name: output / (name.replace(':', '-') + '.pcm') for name in interfaces}
    response = output / 'modules.rsp'
    response.write_text('\n'.join(f'-fmodule-file={name}="{path}"' for name, path in maps.items()) + f'\n-fmodule-file=std="{output / "std.pcm"}"')
    module_flags = flags + ['@' + str(response)]

    def run(command, log):
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        (output / log).write_text(result.stdout)
        if result.returncode:
            raise RuntimeError('Command failed: ' + ' '.join(command) + '\n' + result.stdout)

    run(flags + ['-Wno-reserved-module-identifier', '--precompile', str(std), '-o', str(output / 'std.pcm')], 'std.log')
    dependencies = {name: set(re.findall(r'^import :([\w.]+);', path.read_text(), re.M)) for name, path in interfaces.items()}
    completed = set()
    while len(completed) < len(interfaces):
        ready = [name for name in interfaces if name not in completed and all('carven:' + dep in completed for dep in dependencies[name])]
        if not ready:
            raise RuntimeError('Compiler module dependency cycle')

        def bmi(name):
            run(module_flags + ['--precompile', '-x', 'c++-module', str(interfaces[name]), '-o', str(maps[name])], name.replace(':', '-') + '.log')

        with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:
            list(pool.map(bmi, ready))
        completed.update(ready)
        print(f'Compiler modules: {len(completed)}/{len(interfaces)}', flush=True)

    def object_file(item):
        index, source = item
        obj = output / f'{index}.o'
        run(module_flags + ['-c', '-x', 'c++', str(source), '-o', str(obj)], f'{index}.log')
        return obj

    with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:
        objects = list(pool.map(object_file, enumerate(files)))
    run(flags + ['-c', str(output / 'std.pcm'), '-o', str(output / 'std.o')], 'std-object.log')
    wasm = work / 'carven.wasm'
    run(flags + [str(path) for path in objects] + [str(output / 'std.o'), '-Wl,--strip-all',
        '-Wl,-z,stack-size=16777216', '-Wl,--max-memory=536870912', '-o', str(wasm)], 'link.log')
    return wasm


def publish(root, wasm, destination):
    destination.mkdir(parents=True, exist_ok=True)
    files = {path.relative_to(root).as_posix(): path.read_text() for path in sorted((root / 'crafts/carven').rglob('*.cv'))}
    # The source collector uses this header to locate the installed Crafts root.
    files['crafts/carven/runtime/runtime.hpp'] = ''
    crafts = json.dumps({'files': files}, ensure_ascii=False, separators=(',', ':')).encode()
    (destination / 'crafts.json').write_bytes(crafts)
    shutil.copyfile(wasm, destination / 'carven.wasm')
    shutil.copyfile(root / 'LICENSE', destination / 'LICENSE.txt')
    shutil.copyfile(HERE / 'third-party-notices.txt', destination / 'THIRD-PARTY-NOTICES.txt')

    def descriptor(name):
        path = destination / name
        return {'path': name, 'sha256': sha256(path), 'bytes': path.stat().st_size}

    manifest = {'compilerRevision': REVISION, 'wasm': descriptor('carven.wasm'),
                'crafts': descriptor('crafts.json'), 'supportedLibraries': ['Carven standard library'],
                'build': {'wasiSdk': SDK_VERSION, 'llvmRevision': LOCK['commit'],
                          'portabilityOverlay': 'preserve std::array iterator type'}}
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('Published browser compiler assets:', destination, flush=True)
    print(json.dumps(manifest, indent=2), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler-repo', type=pathlib.Path, help='Read pinned Git object locally instead of downloading')
    parser.add_argument('--sdk', type=pathlib.Path, help='Existing official WASI SDK 34 directory')
    parser.add_argument('--llvm-module-dir', type=pathlib.Path, help='Existing standard module matching the checked-in lock')
    parser.add_argument('--cache', type=pathlib.Path, default=SITE / '.site/playground-wasi-cache')
    parser.add_argument('--output', type=pathlib.Path, default=SITE / 'public/playground-assets')
    parser.add_argument('--jobs', type=int, default=min(os.cpu_count() or 2, 8))
    args = parser.parse_args()
    if not 1 <= args.jobs <= 64:
        parser.error('--jobs must be between 1 and 64')
    args.cache.mkdir(parents=True, exist_ok=True)
    sdk = toolchain(args.cache.resolve(), args.sdk)
    std = standard_module(args.cache.resolve(), args.llvm_module_dir, args.jobs)
    with tempfile.TemporaryDirectory(prefix='carven-browser-') as temporary:
        work = pathlib.Path(temporary)
        root = sources(work, args.cache.resolve(), args.compiler_repo)
        wasm = build(root, work, sdk, std, args.jobs)
        publish(root, wasm, args.output.resolve())


if __name__ == '__main__':
    main()
