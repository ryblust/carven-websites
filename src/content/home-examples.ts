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
    status: .Shipped(3),
    items: ["disk", "cable"],
};

println(order);`,
  failures: `struct Missing { key: str }
struct Denied { key: str }
struct BadPort { text: str }

// A small in-memory configuration store.
fn read(key: str) -> str throw Missing + Denied {
    if key == "denied" => throw Denied { key: key };
    if key == "ok" => return "9000";
    if key == "bad" => return "9x00";

    throw Missing { key: key };
}

fn parse(text: str) -> i32 throw BadPort {
    if text.is_empty() => throw BadPort { text: text };

    var value: i32 = 0;

    for byte in text.bytes {
        if byte < 0x30 || byte > 0x39 {
            throw BadPort { text: text };
        }

        value = value * 10 + (byte as i32 - 0x30);
        if value > 65535 => throw BadPort { text: text };
    }

    if value == 0 => throw BadPort { text: text };

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
    var text: String = {};
    text.append("Commands:\\n");

    for command in commands {
        if command.enabled {
            text.append(f"  {command.name}: {command.summary}\\n");
        }
    }

    return text;
}

const help: str = help_text([
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
  simd: `import std::simd.bytes using { block_count, load_block }

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
    if text.byte_length() != pattern.byte_length() => return false;

    const for index in 0..pattern.byte_length() {
        const if pattern.bytes[index] == "D".bytes[0] {
            let byte = text.bytes[index];
            // ASCII digits: 0x30 ('0') through 0x39 ('9').
            if byte < 0x30 || byte > 0x39 => return false;
        } else {
            if text.bytes[index] != pattern.bytes[index] => return false;
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
  configuration: `import std::json using { JSONValue, JSONValueError }

const defaults = JSONValue::parse(r#"{"workers":2,"tags":["stable"]}"#)?;

fn configure(workers: i64) -> String throw JSONValueError {
    var config = defaults;
    config.set("workers", &&JSONValue::integer(workers))?;

    var tags = config.get("tags")?;
    tags.push(&&JSONValue::string("observed"))?;
    config.set("tags", &&tags)?;

    return config.to_json()?;
}

const test "the template starts with two workers" {
    check(try {
        defaults.get("workers")?.as_i64()? == 2
    } catch { JSONValueError(_) => false });
}

println(configure(8)?);
let original = defaults;
println(original.to_json()?);`,
  logAnalysis: `import std::core using NumberParseError;
import std::utf using { split_once, TextError }

enum RecordError {
    Shape,
    InvalidLatency(NumberParseError),
    TextProcessing(TextError)
}

struct Record { milliseconds: u64, message: String }

fn parse_record(text: str) -> Record throw RecordError {
    try {
        let fields = split_once(text, " ")?;
        if !fields.found => throw RecordError::Shape;

        return {
            milliseconds: u64::parse(fields.before)?,
            message: fields.after as String,
        };
    } catch {
        NumberParseError(error) => throw RecordError::InvalidLatency(error),
        TextError(error) => throw RecordError::TextProcessing(error),
    }
}

for line in ["37 token=[redacted]", "nope malformed", "42 超时"] {
    try {
        let record = parse_record(line)?;
        println(f"{record.milliseconds}ms: {record.message}");
    } catch {
        RecordError(_) => println("rejected:", line),
    }
}`,
  asyncWorkflow: `import std::async using { yield_once, when_all, first_successful }

struct BelowTarget { actual: i32, required: i32 }
struct Batch { name: String, records: Vector<i32>, total: i32 }

async fn collect(&&name: String, &&input: [i32; 4]) -> Batch {
    var batch: Batch = { name: &&name, records: [], total: 0 };

    for value in input {
        await yield_once();
        if value < 0 => continue;

        batch.records.push(value);
        batch.total += value;
    }

    return batch;
}

async fn eligible(value: i32, target: i32) -> i32 throw BelowTarget {
    await yield_once();
    if value < target => throw BelowTarget { actual: value, required: target };

    return value;
}

async fn main() throw BelowTarget {
    let (west, east) = await when_all(
        collect(&&("west" as String), &&[2, -1, 4, 6]),
        collect(&&("east" as String), &&[1, 3, -1, 5]),
    );

    let (index, chosen) = await first_successful(
        eligible(west.total, 20), eligible(west.total + east.total, 20),
    )?;

    println(f"{west.name}: {west.records.length()} records, total {west.total}");
    println(f"{east.name}: {east.records.length()} records, total {east.total}");
    println(f"selected {index}: {chosen}");
}`,
  asyncWorkflowCpp: `#include <asio.hpp>
#include <asio/experimental/awaitable_operators.hpp>
#include <array>
#include <print>
#include <string>
#include <utility>
#include <variant>
#include <vector>

using namespace asio::experimental::awaitable_operators;

struct BelowTarget { int actual, required; };
struct Batch {
    std::string name;
    std::vector<int> records;
    int total = 0;
};

asio::awaitable<Batch> collect(std::string name, std::array<int, 4> input) {
    Batch batch{std::move(name), {}};

    for (int value : input) {
        co_await asio::post(asio::use_awaitable);
        if (value < 0) continue;

        batch.records.push_back(value);
        batch.total += value;
    }

    co_return batch;
}

asio::awaitable<int> eligible(int value, int target) {
    co_await asio::post(asio::use_awaitable);
    if (value < target) throw BelowTarget{value, target};

    co_return value;
}

asio::awaitable<void> run() {
    auto [west, east] = co_await (
        collect("west", {2, -1, 4, 6}) && collect("east", {1, 3, -1, 5}));

    auto winner = co_await (
        eligible(west.total, 20) || eligible(west.total + east.total, 20));
    int chosen = std::visit([](int value) { return value; }, winner);

    std::println("{}: {} records, total {}", west.name, west.records.size(), west.total);
    std::println("{}: {} records, total {}", east.name, east.records.size(), east.total);
    std::println("selected {}: {}", winner.index(), chosen);
}

int main() {
    asio::io_context loop;
    auto result = asio::co_spawn(loop, run(), asio::use_future);

    loop.run();
    result.get();
}`,
  asyncScope: `import std::async using { cancel_point, yield_once, close }

const async fn count(&processed: i32) {
    while {
        await cancel_point();
        ++processed;
        await yield_once();
    }
}

const async fn run_one() -> i32 {
    var processed = 0;
    async let worker = count(&processed);
    await yield_once();

    cancel worker;
    await close(worker);

    return processed;
}

const preview = await run_one();

const async test "a child closes before its backing is taken" {
    check(await run_one() == 1);
}

async test "runtime uses the same cleanup" {
    check(await run_one() == 1);
}

async fn main() {
    println(f"compile time: {preview}; runtime: {await run_one()}");
}`,
  asyncScopeCpp: `#include <print>

struct Counter {
    int& processed;
    bool stop_requested = false;
    bool closed = false;

    constexpr void resume() {
        if (closed) return;
        if (stop_requested) closed = true;
        else ++processed;
    }

    constexpr void cancel() { stop_requested = true; }

    constexpr void close() {
        cancel();
        resume();
    }

    constexpr ~Counter() { close(); }
};

constexpr int run_one() {
    int processed = 0;
    Counter worker{processed};
    worker.resume();

    worker.cancel();
    worker.close();

    return processed;
}

constexpr int preview = run_one();
static_assert(preview == 1);

int main() {
    std::println("compile time: {}; runtime: {}", preview, run_one());
}`,
  audioMixer: `import std::simd.floats using { block_count, load_block }

enum MixError { Length, NonFinite }
struct Mix { samples: Vector<f32>, clipped: usize, peak: f32 }

const fn mix(voice: [f32], music: [f32]) -> Mix throw MixError {
    if voice.length() != music.length() => throw MixError::Length;

    var result: Mix = {};
    result.samples.reserve(voice.length());

    for index in 0..block_count(voice) {
        let left = load_block(voice, index * 8);
        let right = load_block(music, index * 8);
        let combined = left.value + right.value * 0.5;

        if ((~combined.is_finite()) & left.active).any() => throw MixError::NonFinite;

        result.clipped += ((combined.abs() > 1.0) & left.active).count();
        let samples = combined.clamp(-1.0, 1.0).to_array();

        for lane in 0..left.length {
            result.samples.push(samples[lane]);
            result.peak = result.peak.max(samples[lane].abs());
        }
    }

    return result;
}

const voice: [f32; 9] = [0.5; 9];
const music: [f32; 9] = [0.25, -0.25, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 2.0];
const preview = mix(voice, music)?;

const test "clip only active lanes, including the final sample" {
    check(preview.samples.length() == 9);
    check(preview.clipped == 1 && preview.samples[8] == 1.0);
}

let output = mix(voice, music)?;
println(f"samples={output.samples.length()} clipped={output.clipped} peak={output.peak:.2f}");
println(f"first={output.samples[0]:.3f} second={output.samples[1]:.3f} last={output.samples[8]:.3f}");`,
  configurationCpp: `#include <iostream>
#include <nlohmann/json.hpp>

int main() {
    // This comparison parses at runtime.
    const auto defaults = nlohmann::ordered_json::parse(
        R"({"workers":2,"tags":["stable"]})");

    auto config = defaults;
    config["workers"] = 8;
    config["tags"].push_back("observed");

    std::cout << config.dump() << '\\n';
    std::cout << defaults.dump() << '\\n';
}`,
  audioMixerCpp: `#include <algorithm>
#include <array>
#include <cmath>
#include <format>
#include <iostream>
#include <span>
#include <stdexcept>
#include <vector>

struct Mix {
    std::vector<float> samples;
    std::size_t clipped = 0;
    float peak = 0.0f;
};

Mix mix(std::span<const float> voice, std::span<const float> music) {
    if (voice.size() != music.size()) {
        throw std::invalid_argument("track length");
    }

    Mix result;
    result.samples.reserve(voice.size());

    for (std::size_t index = 0; index < voice.size(); ++index) {
        const float combined = voice[index] + music[index] * 0.5f;

        if (!std::isfinite(combined)) {
            throw std::invalid_argument("nonfinite sample");
        }

        result.clipped += std::abs(combined) > 1.0f;
        const float sample = std::clamp(combined, -1.0f, 1.0f);

        result.samples.push_back(sample);
        result.peak = std::max(result.peak, std::abs(sample));
    }

    return result;
}

int main() {
    const std::array<float, 9> voice{
        0.5f, 0.5f, 0.5f, 0.5f, 0.5f, 0.5f, 0.5f, 0.5f, 0.5f};
    const std::array<float, 9> music{0.25f, -0.25f, 0, 0, 0, 0, 0, 0, 2};
    const auto output = mix(voice, music);

    std::cout << std::format("samples={} clipped={} peak={:.2f}\\n",
        output.samples.size(), output.clipped, output.peak);
    std::cout << std::format("first={:.3f} second={:.3f} last={:.3f}\\n",
        output.samples[0], output.samples[1], output.samples[8]);
}`,
  tomlSummary: `import std::toml using { TOMLValue, TOMLValueError }
import std::collections using { HashMap, HashSet }

const settings = TOMLValue::parse("""
    minimum = 20
    ignored = ["health"]
    """)?;

struct Request { service: str, milliseconds: i64 }
struct Summary { counts: HashMap<String, usize>, accepted: usize }

fn summarize(config: TOMLValue, requests: [Request]) -> Summary throw TOMLValueError {
    let minimum = config.get("minimum")?.as_i64()?;
    let names = config.get("ignored")?;
    var ignored = HashSet<String>::new();
    for name in names.elements()? {
        let key = name.as_str()? as String;
        ignored.insert(&&key);
    }

    var result: Summary = { counts: HashMap<String, usize>::new(), ... };
    for request in requests {
        let key = request.service as String;
        if request.milliseconds < minimum || ignored.contains(key) => continue;
        let count = result.counts.find_mut(key);
        if count != nullptr => ++*count;
        else => result.counts.insert(&&key, &&1);
        ++result.accepted;
    }
    return result;
}

let report = summarize(settings, [
    { service: "api", milliseconds: 25 },
    { service: "health", milliseconds: 100 },
    { service: "api", milliseconds: 35 },
    { service: "web", milliseconds: 18 },
    { service: "web", milliseconds: 40 },
])?;
for entry in report.counts.entries() {
    println(f"{entry.key}: {entry.value}");
}
println(f"accepted: {report.accepted}");`,
  tomlSummaryCpp: `#include <toml++/toml.hpp>
#include <array>
#include <cstdint>
#include <iostream>
#include <span>
#include <stdexcept>
#include <string>
#include <string_view>
#include <unordered_map>
#include <unordered_set>
#include <vector>

struct Request { std::string_view service; std::int64_t milliseconds; };
struct Summary {
    std::unordered_map<std::string, std::size_t> counts;
    std::vector<std::string> order;
    std::size_t accepted = 0;
};

Summary summarize(const toml::table& config, std::span<const Request> requests) {
    const auto minimum = config["minimum"].value<std::int64_t>().value();
    const auto* names = config["ignored"].as_array();
    if (!names) throw std::runtime_error("ignored must be an array");
    std::unordered_set<std::string> ignored;
    for (const auto& name : *names) {
        ignored.insert(name.value<std::string>().value());
    }

    Summary result;
    for (const auto& request : requests) {
        std::string key{request.service};
        if (request.milliseconds < minimum || ignored.contains(key)) continue;
        auto [count, inserted] = result.counts.try_emplace(key, 0);
        if (inserted) result.order.push_back(key);
        ++count->second;
        ++result.accepted;
    }
    return result;
}

int main() {
    const auto settings = toml::parse(R"(
        minimum = 20
        ignored = ["health"]
    )");
    const std::array<Request, 5> requests{{
        {"api", 25}, {"health", 100}, {"api", 35}, {"web", 18}, {"web", 40},
    }};
    const auto report = summarize(settings, requests);
    for (const auto& key : report.order) {
        std::cout << key << ": " << report.counts.at(key) << '\\n';
    }
    std::cout << "accepted: " << report.accepted << '\\n';
}`,
  closurePolicy: `fn apply<T, U>(value: T, transform: fn(T) -> U) -> U => transform(value);
const fn quote(fee: i32) => [fee](amount: i32) => amount + fee;

const test "a captured fee executes during compilation" {
    let policy = quote(3);
    check(policy(100) == 103);
}

var fee = 3;
let policy = quote(fee);
let snapshot = policy;
fee = 10;

println("Original quote:", apply(100, snapshot));
println("Updated quote:", apply(100, quote(fee)));`,
  closurePolicyCpp: `#include <iostream>

template <typename T, typename Transform>
auto apply(const T& value, const Transform& transform) {
    return transform(value);
}

constexpr auto quote(int fee) {
    return [fee](int amount) { return amount + fee; };
}

static_assert(quote(3)(100) == 103);

int main() {
    int fee = 3;
    const auto policy = quote(fee);
    const auto snapshot = policy;
    fee = 10;

    std::cout << "Original quote: " << apply(100, snapshot) << '\\n';
    std::cout << "Updated quote: " << apply(100, quote(fee)) << '\\n';
}`,
  projectBuild: `import std::build using project;

project({
    targets: [{
        name: "shop",
        kind: .Executable,
        sources: ["src/main.cv", "src/pricing.cv"],
        ...
    }],
    ...
})?;`,
  projectInlineTests: `fn discounted(price: i32, percent: i32) -> i32 =>
    price * (100 - percent) / 100;

test "discounted price" {
    check(discounted(1200, 0) == 1200);
    check(discounted(1200, 25) == 900);
}`,
} as const;
