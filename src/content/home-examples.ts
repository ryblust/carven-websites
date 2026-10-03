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
  failures: `struct Missing { key: str }
struct Denied { key: str }
struct BadPort { text: str }

// A small in-memory configuration store.
fn read(key: str) -> str throw Missing + Denied {
    if key == "denied" { throw Denied { key: key }; }
    if key == "ok" { return "9000"; }
    if key == "bad" { return "9x00"; }
    throw Missing { key: key };
}

fn parse(text: str) -> i32 throw BadPort {
    if text.len() == 0 { throw BadPort { text: text }; }
    var value: i32 = 0;
    for byte in text.bytes {
        if byte < 0x30 || byte > 0x39 {
            throw BadPort { text: text };
        }
        value = value * 10 + (byte as i32 - 0x30);
        if value > 65535 { throw BadPort { text: text }; }
    }
    if value == 0 { throw BadPort { text: text }; }
    return value;
}

fn port(key: str) -> i32 throw Denied + BadPort => try {
    parse(read(key)?)?
} catch {
    Missing(_) => 8080,
};

for key in ["ok", "missing", "denied", "bad"] {
    try {
        println(key, port(key)?);
    } catch {
        Denied(error) => println("Denied:", error.key),
        BadPort(error) => println("Bad port:", error.text),
    }
}`,
  constants: `struct Command { name: str, summary: str, enabled: bool }

const fn help_text(commands: [Command; 3]) -> String {
    var text = String {};
    text.append("Commands:\\n");
    for command in commands {
        if command.enabled {
            text.append(f"  {command.name}: {command.summary}\\n");
        }
    }
    return &&text;
}

const help = help_text([
    { name: "build", summary: "Compile the project", enabled: true },
    { name: "run", summary: "Run the program", enabled: true },
    { name: "trace", summary: "Show debug traces", enabled: false },
]);

const test {
    check(help == """
        Commands:
          build: Compile the project
          run: Run the program

        """);
}

println(help);`,
  simd: `import std::simd.bytes using { block_count, load_block };

const fn count_delimiters(bytes: [u8], delimiter: u8) -> usize {
    var count: usize = 0;
    for index in 0..block_count(bytes) {
        let block = load_block(bytes, index * 32);
        count += ((block.value == delimiter) & block.active).count();
    }
    return count;
}

const test {
    check(count_delimiters("name,age,city".bytes, 0x2c) == 2);
    check(count_delimiters("abc".bytes, 0) == 0);
}

let row = "name,age,city";
println(count_delimiters(row.bytes, 0x2c));`,
  specialization: `fn matches(text: str, const pattern: str) -> bool {
    if text.len() != pattern.len() { return false; }
    const for index in 0..pattern.len() {
        const if pattern.bytes[index] == "D".bytes[0] {
            let byte = text.bytes[index];
            // ASCII digits: 0x30 ('0') through 0x39 ('9').
            if byte < 0x30 || byte > 0x39 { return false; }
        } else {
            if text.bytes[index] != pattern.bytes[index] { return false; }
        }
    }
    return true;
}

const id_format = "INV-DDDD";
let invoice = "INV-2048";
let wrong = "INV-20x8";
println(matches(invoice, id_format), matches(wrong, id_format));`,
  native: `import <nlohmann/json.hpp> using nlohmann::json::parse;

var config = parse("""
    {
        "server": {
            "host": "localhost",
            "port": 8080,
            "debug": true
        }
    }
    """);

let patch = parse("""
    {
        "server": {
            "port": 9000,
            "debug": null
        }
    }
    """);
config.merge_patch(patch);

println(f"{config.dump()}");`,
  displayCpp: `#include <array>
#include <iostream>
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

std::ostream& operator<<(std::ostream& out, const Order& order) {
    out << "Order {\\n"
        << "    id: " << order.id << ",\\n"
        << "    status: ";

    if (auto* shipped = std::get_if<Shipped>(&order.status)) {
        out << "Status::Shipped(\\n"
            << "        " << shipped->boxes << ",\\n    )";
    } else {
        out << "Status::Pending";
    }

    out << ",\\n    items: [\\n";
    for (auto item : order.items) {
        out << "        \\"" << item << "\\",\\n";
    }

    return out << "    ],\\n}";
}

int main() {
    const Order order{7, Shipped{3}, {"disk", "cable"}};
    std::cout << order << '\\n';
}`,
  failuresCpp: `#include <cstdint>
#include <expected>
#include <initializer_list>
#include <iostream>
#include <string_view>
#include <variant>

struct Missing { std::string_view key; };
struct Denied { std::string_view key; };
struct BadPort { std::string_view text; };

using ReadError = std::variant<Missing, Denied>;
using PortError = std::variant<Denied, BadPort>;

// A small in-memory configuration store.
std::expected<std::string_view, ReadError> read(std::string_view key) {
    if (key == "denied") { return std::unexpected(Denied{key}); }
    if (key == "ok") { return "9000"; }
    if (key == "bad") { return "9x00"; }
    return std::unexpected(Missing{key});
}

std::expected<std::int32_t, BadPort> parse(std::string_view text) {
    if (text.empty()) { return std::unexpected(BadPort{text}); }
    std::int32_t value = 0;
    for (unsigned char byte : text) {
        if (byte < 0x30 || byte > 0x39) {
            return std::unexpected(BadPort{text});
        }
        value = value * 10 + (byte - 0x30);
        if (value > 65535) { return std::unexpected(BadPort{text}); }
    }
    if (value == 0) { return std::unexpected(BadPort{text}); }
    return value;
}

std::expected<std::int32_t, PortError> port(std::string_view key) {
    auto text = read(key);
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
}

int main() {
    for (std::string_view key : {"ok", "missing", "denied", "bad"}) {
        auto value = port(key);
        if (value) {
            std::cout << key << ' ' << *value << '\\n';
        } else if (auto* error = std::get_if<Denied>(&value.error())) {
            std::cout << "Denied: " << error->key << '\\n';
        } else {
            std::cout << "Bad port: "
                << std::get<BadPort>(value.error()).text << '\\n';
        }
    }
}`,
  constantsCpp: `#include <algorithm>
#include <array>
#include <iostream>
#include <string>
#include <string_view>

struct Command { std::string_view name, summary; bool enabled; };

constexpr std::string help_text(const std::array<Command, 3>& commands) {
    std::string text = "Commands:\\n";
    for (const auto& command : commands) {
        if (command.enabled) {
            text += "  ";
            text += command.name;
            text += ": ";
            text += command.summary;
            text += '\\n';
        }
    }
    return text;
}

template <auto build>
consteval auto freeze() {
    constexpr auto size = build().size();
    std::array<char, size> data{};
    const auto text = build();
    std::copy(text.begin(), text.end(), data.begin());
    return data;
}

constexpr auto data = freeze<[] {
    return help_text({{
        {"build", "Compile the project", true},
        {"run", "Run the program", true},
        {"trace", "Show debug traces", false},
    }});
}>();

constexpr std::string_view help{data.data(), data.size()};

static_assert(help == "Commands:\\n"
    "  build: Compile the project\\n"
    "  run: Run the program\\n");

int main() {
    std::cout << help << '\\n';
}`,
  simdCpp: `#include <cstddef>
#include <cstdint>
#include <iostream>
#include <span>
#include <string_view>

using Byte = std::uint8_t;
using ByteView = std::span<const Byte>;

constexpr std::size_t count_delimiters(ByteView bytes, Byte delimiter) {
    std::size_t count = 0;
    for (auto byte : bytes) {
        count += byte == delimiter;
    }
    return count;
}

constexpr Byte sample[]{
    'n', 'a', 'm', 'e', ',',
    'a', 'g', 'e', ',',
    'c', 'i', 't', 'y',
};
constexpr Byte short_row[]{'a', 'b', 'c'};

static_assert(count_delimiters(sample, 0x2c) == 2);
static_assert(count_delimiters(short_row, 0) == 0);

int main() {
    const std::string_view row = "name,age,city";
    const auto* bytes = reinterpret_cast<const Byte*>(row.data());

    std::cout << count_delimiters({bytes, row.size()}, 0x2c) << '\\n';
}`,
  specializationCpp: `#include <cstddef>
#include <iostream>
#include <string_view>
#include <utility>

using Text = std::string_view;

template <auto& pattern, std::size_t index>
constexpr bool matches_byte(unsigned char byte) {
    // D marks an ASCII digit; other bytes match literally.
    if constexpr (pattern[index] == 'D') {
        return byte >= '0' && byte <= '9';
    } else {
        return byte == static_cast<unsigned char>(pattern[index]);
    }
}

template <auto& pattern, std::size_t... index>
constexpr bool matches_impl(
    Text text, std::index_sequence<index...>) {
    // Expand checks and short-circuit at the first mismatch.
    return (matches_byte<pattern, index>(text[index]) && ...);
}

template <auto& pattern>
constexpr bool matches(Text text) {
    constexpr auto length = sizeof(pattern) - 1;
    using Indices = std::make_index_sequence<length>;
    return text.size() == length
        && matches_impl<pattern>(text, Indices{});
}

constexpr char id_format[] = "INV-DDDD";

int main() {
    const Text invoice = "INV-2048";
    const Text wrong = "INV-20x8";
    std::cout << std::boolalpha
        << matches<id_format>(invoice) << ' '
        << matches<id_format>(wrong) << '\\n';
}`,
  specialization26Cpp: `#include <cstddef>
#include <iostream>
#include <string_view>
#include <utility>

using Text = std::string_view;

template <auto& pattern, std::size_t... index>
constexpr bool matches_impl(
    Text text, std::index_sequence<index...>) {
    // Expand positions for any pattern length.
    template for (constexpr std::size_t position : {index...}) {
        const auto byte = static_cast<unsigned char>(text[position]);
        // D marks an ASCII digit; other bytes match literally.
        if constexpr (pattern[position] == 'D') {
            if (byte < '0' || byte > '9') { return false; }
        } else {
            if (byte != static_cast<unsigned char>(pattern[position])) {
                return false;
            }
        }
    }
    return true;
}

template <auto& pattern>
constexpr bool matches(Text text) {
    constexpr auto length = sizeof(pattern) - 1;
    using Indices = std::make_index_sequence<length>;
    return text.size() == length
        && matches_impl<pattern>(text, Indices{});
}

constexpr char id_format[] = "INV-DDDD";

int main() {
    const Text invoice = "INV-2048";
    const Text wrong = "INV-20x8";
    std::cout << std::boolalpha
        << matches<id_format>(invoice) << ' '
        << matches<id_format>(wrong) << '\\n';
}`,
  nativeCpp: `#include <iostream>
#include <nlohmann/json.hpp>

int main() {
    auto config = nlohmann::json::parse(R"json(
        {
            "server": {
                "host": "localhost",
                "port": 8080,
                "debug": true
            }
        }
    )json");

    const auto patch = nlohmann::json::parse(R"json(
        {
            "server": {
                "port": 9000,
                "debug": null
            }
        }
    )json");

    config.merge_patch(patch);

    std::cout << config.dump() << '\\n';
}`,
} as const;
