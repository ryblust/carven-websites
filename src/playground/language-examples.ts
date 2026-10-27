// Carven sources shared by Playground presets.
export const languageExamples = {
  quickstart: `let answer = 20 + 22;
println("Answer:", answer);
`,
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

println(order);
`,
  failures: `struct Missing {
    key: str
}

struct Denied {
    key: str
}

struct BadPort {
    text: str
}

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
}
`,
  constants: `struct Command {
    name: str,
    summary: str,
    enabled: bool
}

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
    {
        name: "build",
        summary: "Compile the project",
        enabled: true
    },
    {
        name: "run",
        summary: "Run the program",
        enabled: true
    },
    {
        name: "trace",
        summary: "Show debug traces",
        enabled: false
    },
]);

const test {
    check(help
        == """
        Commands:
          build: Compile the project
          run: Run the program

        """);
}

println(help);
`,
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
println(count_delimiters(row.bytes, 0x2c));
`,
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

println(matches(invoice, id_format), matches(wrong, id_format));
`,
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

println(f"{config.dump()}");
`,
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
    } catch {
        JSONValueError(_) => false
    });
}

println(configure(8)?);
let original = defaults;
println(original.to_json()?);
`,
  logAnalysis: `import std::core using NumberParseError;
import std::utf using { split_once, TextError }

enum RecordError {
    Shape,
    InvalidLatency(NumberParseError),
    TextProcessing(TextError)
}

struct Record {
    milliseconds: u64,
    message: String
}

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
}
`,
  asyncWorkflow: `import std::async using { yield_once, when_all, first_successful }

struct BelowTarget {
    actual: i32,
    required: i32
}

struct Batch {
    name: String,
    records: Vector<i32>,
    total: i32
}

async fn collect(&&name: String, &&input: [i32; 4]) -> Batch {
    var batch: Batch = {
        name: &&name,
        records: [],
        total: 0
    };

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
    if value < target => throw BelowTarget {
        actual: value,
        required: target
    };

    return value;
}

async fn main() throw BelowTarget {
    let (west, east) = await when_all(
        collect(&&("west" as String), &&[2, -1, 4, 6]),
        collect(&&("east" as String), &&[1, 3, -1, 5]),
    );

    let (index, chosen) = await first_successful(
        eligible(west.total, 20),
        eligible(west.total + east.total, 20),
    )?;

    println(f"{west.name}: {west.records.length()} records, total {west.total}");
    println(f"{east.name}: {east.records.length()} records, total {east.total}");
    println(f"selected {index}: {chosen}");
}
`,
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
}
`,
  audioMixer: `import std::simd.floats using { block_count, load_block }

enum MixError {
    Length,
    NonFinite
}

struct Mix {
    samples: Vector<f32>,
    clipped: usize,
    peak: f32
}

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

println(
    f"first={output.samples[0]:.3f} second={output.samples[1]:.3f} last={output.samples[8]:.3f}"
);
`,
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
println("Updated quote:", apply(100, quote(fee)));
`,
} as const;
