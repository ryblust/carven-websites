module;

#include <carven/std/channel/native.hpp>
#include <carven/std/collections/native.hpp>
#include <carven/std/fs/native.hpp>
#include <carven/std/io/native.hpp>

module carven:wasm.main;

import :driver.compile;
import :driver.dump;
import :driver.interpret;
import :diagnostics.report;
import :format;
import :semantic.evaluation.native;
import :source.manager;
import :support.process;
import std;

auto run_browser_host(std::span<const std::string> args) noexcept -> int;
auto close_browser_host() noexcept -> void;

// The browser host installs an isolated source tree at this root.
auto process::executable() noexcept -> std::expected<std::filesystem::path, std::error_code> {
    return "/bin/carven";
}

auto process::run(
    const std::filesystem::path&,
    std::span<const std::string>,
    const std::filesystem::path&,
    Stdio
) noexcept -> std::expected<Result, std::error_code> {
    return std::unexpected(std::make_error_code(std::errc::operation_not_supported));
}

namespace {

auto browser_bindings() noexcept -> std::vector<ExecutionNativeBinding> {
    auto bindings = std::vector<ExecutionNativeBinding>();
    // Register the portable providers available inside the WASI filesystem.
    // Process creation and network providers are unavailable in the browser.
#define OPERATION(symbol, effects)                                                                 \
    bindings.push_back(                                                                            \
        execution_native_function<&carven::standard::symbol>(                                      \
            "carven::standard::" #symbol,                                                          \
            {.static_execution = true, .environment_effects = effects}                             \
        )                                                                                          \
    )
    OPERATION(collections::hash_bytes, false);
    OPERATION(collections::digest, false);
    OPERATION(collections::update_digest, false);
    OPERATION(collections::DigestState::first, false);
    OPERATION(collections::DigestState::second, false);
    OPERATION(channel::create, false);
    OPERATION(channel::close, false);
    OPERATION(channel::try_send, false);
    OPERATION(channel::try_receive, false);
    OPERATION(channel::send, false);
    OPERATION(channel::receive, false);
    OPERATION(channel::Result::available, false);
    OPERATION(channel::Result::end, false);
    OPERATION(channel::Result::take_bytes, false);
    OPERATION(fs::open, true);
    OPERATION(fs::read, true);
    OPERATION(fs::close, true);
    OPERATION(fs::write_bytes, true);
    OPERATION(fs::status, true);
    OPERATION(fs::create_directories, true);
    OPERATION(fs::canonical, true);
    OPERATION(fs::resolve, true);
    OPERATION(fs::parent, false);
    OPERATION(fs::join, false);
    OPERATION(fs::remove, true);
    OPERATION(fs::files, true);
    OPERATION(fs::OpenResult::code, false);
    OPERATION(fs::OpenResult::take_reader, false);
    OPERATION(fs::ReadResult::code, false);
    OPERATION(fs::StatusResult::code, false);
    OPERATION(fs::StatusResult::kind, false);
    OPERATION(fs::RemovalResult::code, false);
    OPERATION(fs::RemovalResult::removed, false);
    OPERATION(fs::PathResult::code, false);
    OPERATION(fs::PathsResult::code, false);
    OPERATION(fs::ReadResult::take_bytes, false);
    OPERATION(fs::PathResult::take_path, false);
    OPERATION(fs::PathsResult::take_paths, false);
    OPERATION(io::write_stdout, true);
    OPERATION(io::write_output, true);
#undef OPERATION

    const auto conversion = [&]<typename From, typename To>(std::string_view name) noexcept {
        bindings.push_back(
            execution_native_conversion<From, To>(
                std::string(name),
                {.static_execution = true, .environment_effects = false}
            )
        );
    };
    conversion.operator()<carven::standard::channel::Handle, carven::standard::channel::Handle>(
        "carven::standard::channel::Handle"
    );
    conversion.operator()<carven::standard::fs::Reader, carven::standard::fs::Reader>(
        "carven::standard::fs::Reader"
    );
    conversion.operator()<bool, bool>({});
    conversion.operator()<std::uint8_t, std::uint8_t>({});
    conversion.operator()<std::int32_t, std::int32_t>({});
    conversion.operator()<std::uint64_t, std::uint64_t>({});
    conversion.operator()<carven::runtime::String, carven::runtime::String>({});
    conversion.
    operator()<carven::runtime::Vector<std::uint8_t>, carven::runtime::Vector<std::uint8_t>>({});
    conversion.operator()<
        carven::runtime::Vector<carven::runtime::String>,
        carven::runtime::Vector<carven::runtime::String>>({});
    conversion.operator()<std::int32_t, std::size_t>({});
    conversion.operator()<std::size_t, std::size_t>({});
    return bindings;
}

} // namespace

auto run_browser_command(std::span<const std::string> command_line) noexcept -> int {
    if (command_line.empty()) {
        return 1;
    }
    const auto args = command_line.subspan(1uz);
    const auto command = std::string_view(command_line.front());
    const auto native_bindings = browser_bindings();
    if (command == "host") {
        return run_browser_host(args);
    }
    if (command == "format") {
        if (args.size() != 1uz) {
            return 2;
        }
        auto sources = SourceManager();
        const auto source = sources.append_file(args.front());
        if (!source) {
            std::println(std::cerr, "carven-format: {}", source.error().message);
            return 2;
        }
        const auto formatted = format_source(sources, *source);
        if (!formatted) {
            std::print(std::cerr, "{}", render_diagnostics(formatted.error(), sources, false));
            return 2;
        }
        std::print("{}", *formatted);
        return 0;
    }
    if (command == "check") {
        return run_compilation_command(args, CompilationCommand::Check, native_bindings);
    }
    if (command == "dump") {
        return run_dump_command(args);
    }
    if (command == "interpret") {
        return run_interpret_command(args, native_bindings);
    }
    if (command == "compile") {
        return run_compilation_command(args, CompilationCommand::Compile, native_bindings);
    }
    return 1;
}

extern "C" auto carven_execute() noexcept -> int {
    auto command = std::ifstream(".playground-command");
    auto args = std::vector<std::string>();
    for (auto line = std::string(); std::getline(command, line);) {
        args.push_back(std::move(line));
    }
    const auto result = run_browser_command(args);
    std::cout.flush();
    std::cerr.flush();
    return result;
}

extern "C" auto carven_close() noexcept -> void {
    close_browser_host();
}
