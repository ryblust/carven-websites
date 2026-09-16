// Authored homepage snippets. Highlighted during content generation.
export const homeExamples = {
  failures: `// read: str throw Missing + Denied
// parse: i32 throw BadPort
fn port() -> i32 throw Denied + BadPort {
    return try {
        parse(read()?)?
    } catch {
        Missing(_) => 8080,
    };
}`,
  constants: `const fn join(items: [str; 3]) -> String {
    var text = String::new();
    for item in items {
        if !text.is_empty() {
            text.append(" / ");
        }
        text.append(item);
    }
    return text;
}

const menu = join(["Home", "Docs", "About"]);`,
  native: `import <nlohmann/json.hpp> using nlohmann::json::parse;

fn main() {
    let config = parse(c"{\\"port\\":9000}");
    let port: i32 = config.value(c"port", 8080);
    println(f"Port: {port}");
}`,
  failuresCpp: `#include <expected>
#include <string_view>
#include <variant>

std::expected<std::string_view,
    std::variant<Missing, Denied>> read();
std::expected<int, BadPort> parse(std::string_view text);

std::expected<int, std::variant<Denied, BadPort>> port() {
    auto text = read();
    if (!text) {
        if (std::holds_alternative<Missing>(text.error())) {
            return 8080;
        }
        return std::unexpected(std::get<Denied>(text.error()));
    }
    auto value = parse(*text);
    if (!value) {
        return std::unexpected(value.error());
    }
    return *value;
}`,
  constantsCpp: `#include <array>
#include <string>
#include <string_view>

constexpr std::string join(std::array<std::string_view, 3> items) {
    std::string text;
    for (auto item : items) {
        if (!text.empty()) {
            text.append(" / ");
        }
        text.append(item);
    }
    return text;
}

template <auto build>
consteval auto freeze() {
    std::array<char, build().size()> data{};
    auto text = build();
    for (std::size_t i = 0; i < data.size(); ++i) {
        data[i] = text[i];
    }
    return data;
}

constexpr auto data = freeze<[] {
    return join({"Home", "Docs", "About"});
}>();
constexpr std::string_view menu{data.data(), data.size()};`,
  nativeCpp: `#include <iostream>
#include <nlohmann/json.hpp>

int main() {
    const auto config = nlohmann::json::parse("{\\"port\\":9000}");
    const int port = config.value("port", 8080);
    std::cout << "Port: " << port << '\\n';
}`,
} as const;
