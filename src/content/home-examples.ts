// Authored homepage snippets. Highlighted during content generation.
export const homeExamples = {
  quickstart: `let answer = 20 + 22;
println("Answer:", answer);`,
  display: `enum Status {
    Pending,
    Shipped(i32),
}

struct Order {
    id: i32,
    status: Status,
    items: [str; 2],
}

let order = Order {
    id: 7,
    status: Status::Shipped(3),
    items: ["disk", "cable"],
};

println(order);`,
  failures: `// read: str throw Missing + Denied
// parse: i32 throw BadPort
fn port() -> i32 throw Denied + BadPort => try {
    parse(read()?)?
} catch {
    Missing(_) => 8080,
};`,
  constants: `struct Route { path: str, enabled: bool }

const fn route_list(routes: [Route; 3]) -> String {
    var text: String = {};
    for route in routes {
        if route.enabled {
            text.append(route.path);
            text.append("\\n");
        }
    }
    return text;
}

const endpoints = route_list([
    { path: "/health", enabled: true },
    { path: "/users", enabled: true },
    { path: "/debug", enabled: false },
]);

const test {
    check(endpoints == "/health\\n/users\\n");
}`,
  native: `import <nlohmann/json.hpp> using nlohmann::json::parse;

let config = parse(c"{\\"port\\":9000}");
let port: i32 = config.value(c"port", 8080);
println(f"Port: {port}");`,
  displayCpp: `#include <array>
#include <ostream>
#include <string_view>
#include <variant>

struct Pending {};
struct Shipped { int boxes; };
using Status = std::variant<Pending, Shipped>;

struct Order {
    int id;
    Status status;
    std::array<std::string_view, 2> items;
};

std::ostream& operator<<(std::ostream& out, const Status& status) {
    if (auto* shipped = std::get_if<Shipped>(&status)) {
        return out << "Status::Shipped(" << shipped->boxes << ")";
    }
    return out << "Status::Pending";
}

std::ostream& operator<<(std::ostream& out, const Order& order) {
    out << "Order {\\n"
        << "    id: " << order.id << ",\\n"
        << "    status: " << order.status << ",\\n"
        << "    items: [";
    for (auto item : order.items) {
        out << '"' << item << "\\", ";
    }
    return out << "],\\n}\\n";
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

struct Route { std::string_view path; bool enabled; };

constexpr std::string route_list(std::array<Route, 3> routes) {
    std::string text;
    for (auto route : routes) {
        if (route.enabled) {
            text.append(route.path);
            text.append("\\n");
        }
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
    return route_list({{
        {"/health", true},
        {"/users", true},
        {"/debug", false},
    }});
}>();
constexpr std::string_view endpoints{data.data(), data.size()};
static_assert(endpoints == "/health\\n/users\\n");`,
  nativeCpp: `#include <iostream>
#include <nlohmann/json.hpp>

int main() {
    const auto config = nlohmann::json::parse("{\\"port\\":9000}");
    const int port = config.value("port", 8080);
    std::cout << "Port: " << port << '\\n';
}`,
} as const;
