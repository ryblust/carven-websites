module;

#include <carven/hosting/api.hpp>

module carven:wasm.hosting;

import std;

namespace {

auto read_source(void*, std::string_view module) noexcept -> std::expected<HostSource, HostError> {
    auto path = std::string(module);
    std::ranges::replace(path, '.', '/');
    path += ".cv";
    auto file = std::ifstream(path);
    if (!file) {
        return std::unexpected(hosting_error(HostErrorKind::Input, "cannot read " + path));
    }
    return HostSource {
        .module_path = std::string(module),
        .origin = path,
        .text = std::string(std::istreambuf_iterator<char>(file), {})
    };
}

auto quoted(std::ostream& output, std::string_view text) noexcept -> void {
    output << '"';
    for (const auto byte : text) {
        switch (byte) {
            case '"':  output << "\\\""; break;
            case '\\': output << "\\\\"; break;
            case '\n': output << "\\n"; break;
            case '\r': output << "\\r"; break;
            case '\t': output << "\\t"; break;
            default:
                if (static_cast<unsigned char>(byte) < 32) {
                    output << std::format("\\u{:04x}", static_cast<unsigned char>(byte));
                } else {
                    output << byte;
                }
        }
    }
    output << '"';
}

auto json(std::ostream& output, const HostValue& value) noexcept -> bool {
    return std::visit(
        [&]<typename T>(const T& item) noexcept -> bool {
            if constexpr (std::same_as<T, std::monostate>) {
                output << "null";
            } else if constexpr (std::same_as<T, bool>) {
                output << (item ? "true" : "false");
            } else if constexpr (std::integral<T>) {
                // Keep 64-bit integers exact across the JavaScript boundary.
                if constexpr (sizeof(T) == 8) {
                    quoted(output, std::to_string(item));
                } else {
                    output << +item;
                }
            } else if constexpr (std::same_as<T, std::string>) {
                quoted(output, item);
            } else if constexpr (std::same_as<T, std::vector<HostValue>>) {
                output << '[';
                auto separator = "";
                for (const auto& child : item) {
                    output << std::exchange(separator, ",");
                    if (!json(output, child)) {
                        return false;
                    }
                }
                output << ']';
            } else if constexpr (std::same_as<T, HostRecord>) {
                output << '{';
                auto separator = "";
                for (const auto& field : item.fields) {
                    output << std::exchange(separator, ",");
                    quoted(output, field.name);
                    output << ':';
                    if (!json(output, field.value)) {
                        return false;
                    }
                }
                output << '}';
            } else {
                return false;
            }
            return true;
        },
        value
    );
}

auto report(const HostError& error) noexcept -> int {
    if (error.location) {
        std::println(
            std::cerr,
            "{}:{}:{}: {}",
            error.location->file,
            error.location->line,
            error.location->column,
            error.message
        );
    } else {
        std::println(std::cerr, "{}", error.message);
    }
    return 1;
}

} // namespace

namespace {

std::optional<HostSession> session;

auto dependencies() noexcept -> HostSourceResolver {
    return {
        .context = nullptr,
        .resolve = [](void*, std::string_view name) noexcept
            -> std::expected<std::optional<HostSource>, HostError> {
            auto source = read_source(nullptr, name);
            if (!source) {
                return std::unexpected(source.error());
            }
            return std::move(*source);
        }
    };
}

auto module_name(std::string path) noexcept -> std::string {
    path.resize(path.size() - 3uz);
    std::ranges::replace(path, '/', '.');
    return path;
}

auto update(std::span<const std::string> args) noexcept -> int {
    if (args.size() < 2uz) {
        return 2;
    }
    const auto module = module_name(args[0]);
    const auto sink = HostOutput {
        .context = nullptr,
        .write = [](void*, bool error, std::string_view bytes) noexcept {
            std::print(error ? std::cerr : std::cout, "{}", bytes);
        }
    };
    auto sources = std::vector<HostSource>();
    for (const auto& path : args.subspan(2uz)) {
        auto source = read_source(nullptr, module_name(path));
        if (!source) {
            return report(source.error());
        }
        sources.push_back(std::move(*source));
    }
    // Check the selected entry before publication as well as the whole project.
    // Missing/private/unsupported entries must not replace a working program.
    const auto candidate = HostProgram::load(module, sources, sink, dependencies());
    if (!candidate) {
        return report(candidate.error());
    }
    const auto function = candidate->function(args[1]);
    if (!function) {
        return report(function.error());
    }
    if (session) {
        const auto reloaded = session->reload(sources, dependencies());
        if (!reloaded) {
            return report(reloaded.error());
        }
    } else {
        auto options = host_session_options();
        options.calls.output = sink;
        options.calls
            .limits = {.steps = 100000uz, .byte_work = 128uz * 1024uz, .aggregate_work = 100000uz};
        auto created = HostSession::create(*candidate, options);
        if (!created) {
            return report(created.error());
        }
        session.emplace(std::move(*created));
    }
    return 0;
}

} // namespace

auto close_browser_host() noexcept -> void {
    if (session) {
        session->close();
    }
    session.reset();
}

auto run_browser_host(std::span<const std::string> args) noexcept -> int {
    if (args.empty()) {
        return 2;
    }
    if (args[0] == "update") {
        return update(args.subspan(1uz));
    }
    if (args[0] != "call" || args.size() < 2uz || !session) {
        return 2;
    }
    auto arguments = std::vector<HostValue>();
    for (const auto& text : args.subspan(2uz)) {
        auto value = std::int32_t();
        const auto [end, error] = std::from_chars(text.data(), text.data() + text.size(), value);
        if (error != std::errc() || end != text.data() + text.size()) {
            return 2;
        }
        arguments.emplace_back(value);
    }
    auto task = session->submit(args[1], arguments);
    if (!task) {
        return report(task.error());
    }
    while (!task->result() && session->poll(256uz) == HostSessionStatus::Runnable) {
    }
    const auto* result = task->result();
    if (!result) {
        task->cancel();
        std::println(std::cerr, "The preview has no provider for this pending operation.");
        return 1;
    }
    if (!*result) {
        return report(result->error());
    }
    const auto* value = std::get_if<HostValue>(&**result);
    if (!value) {
        if (const auto* failure = std::get_if<HostFailure>(&**result)) {
            std::println(std::cerr, "{}::{}", failure->module_path(), failure->name());
        } else {
            std::println(std::cerr, "The hosted call was cancelled.");
        }
        return 1;
    }
    auto output = std::ostringstream();
    if (!json(output, *value)) {
        std::println(std::cerr, "This preview cannot display the returned native value or enum.");
        return 1;
    }
    auto file = std::ofstream("generated/host-result.json");
    file << output.str();
    return file ? 0 : 1;
}
