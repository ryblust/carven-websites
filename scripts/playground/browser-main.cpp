module carven:browser.main;

import :driver.check;
import :driver.compile;
import :driver.interpret;
import :driver.process;
import std;

// The browser host installs an isolated, read-only source tree at this root.
auto current_executable_path(std::string_view) noexcept -> std::filesystem::path {
    return "/bin/carven";
}

extern "C++" auto main(int argc, const char* const* argv) noexcept -> int {
    if (argc < 2) {
        return 1;
    }
    const auto args = std::span(argv + 2, static_cast<std::size_t>(argc - 2));
    const auto command = std::string_view(argv[1]);
    if (command == "check") {
        return run_check_command("/bin/carven", args);
    }
    if (command == "interpret") {
        return run_interpret_command("/bin/carven", args);
    }
    if (command == "compile") {
        return run_compile_command("/bin/carven", args);
    }
    return 1;
}
