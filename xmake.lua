set_project("carven-wasm")
add_rules("mode.release")
set_defaultmode("release")
set_defaultplat("wasm")
set_languages("c++26")
set_exceptions("no-cxx")

local site = os.projectdir()
local playground = path.join(site, "src/playground")
local source = path.absolute(os.getenv("CARVEN_SOURCE_DIR") or path.join(site, ".deps/carven"), site)
local sdk = os.getenv("WASI_SDK_PATH")
local destination = path.join(site, "public/playground-assets")

target("carven-wasm")
    set_policy("build.optimization.lto", true)
    set_filename("carven.wasm")
    set_targetdir(destination)
    set_toolchains("wasi")
    -- Xmake 3.1.1's WASI toolchain does not identify libc++ for std discovery.
    add_files(path.join(sdk, "share/wasi-sysroot/share/libc++/v1/std.cppm"))
    add_files(path.join(source, "src/**.cppm"))
    add_files(path.join(source, "src/**.cpp|carven.cpp|support/process.cpp|driver/cli.cpp"))
    add_includedirs(path.join(source, "crafts"))
    for _, component in ipairs({"collections", "channel", "fs"}) do
        add_files(path.join(source, "crafts/carven/std", component, "native.cpp"))
    end
    for _, component in ipairs({"source", "layout", "format"}) do
        add_files(path.join(source, "tools/format/src", component, "*.cppm"))
        add_files(path.join(source, "tools/format/src", component, "*.cpp"))
    end
    add_files(path.join(playground, "carven-wasm.cpp"))
    add_files(path.join(playground, "native-io.cpp"))
    -- std.cppm includes <csignal> and <csetjmp>, whose WASI headers require these.
    add_defines("_WASI_EMULATED_SIGNAL")
    add_cxxflags("-fno-rtti", "-mexception-handling", {force = true})
    -- The compiler and typed native bridges need more than WASI's default 64 KiB stack.
    add_ldflags("-Wl,-z,stack-size=2097152", {force = true})
    after_build(function ()
        import("core.base.json")
        local files = {}
        for _, file in ipairs(os.files(path.join(source, "crafts/carven/**.cv"))) do
            files[path.unix(path.relative(file, source))] = io.readfile(file)
        end
        io.writefile(path.join(destination, "crafts.json"), json.encode({files = files}, {pure = true, orderkeys = true}))
        os.cp(path.join(source, "LICENSE"), path.join(destination, "LICENSE.txt"))
        os.cp(path.join(playground, "third-party-notices.txt"), path.join(destination, "THIRD-PARTY-NOTICES.txt"))
        local revision = os.iorunv("git", {"-C", source, "rev-parse", "HEAD"}):trim()
        if os.iorunv("git", {"-C", source, "status", "--porcelain"}):trim() ~= "" then
            revision = revision .. "-dirty"
        end
        io.writefile(path.join(destination, "compiler-revision.txt"), revision .. "\n")
    end)
target_end()
