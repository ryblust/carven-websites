export const extraExamples = {
  requestSummary: `import std::collections using { HashMap, HashSet }
import std::core using NumberParseError;
import std::toml using { TOMLValue, TOMLValueError }
import std::utf using { lines, split_once, TextError }

struct Summary {
    counts: HashMap<String, usize>,
    accepted: usize,
}

fn summarize(
    config: TOMLValue,
    input: str
) -> Summary throw TOMLValueError + TextError + NumberParseError {
    let minimum = config.get("minimum_ms")?.as_i64()?;
    let names = config.get("ignored")?;
    var ignored = HashSet<String>::new();
    for name in names.elements()? {
        let key = name.as_str()? as String;
        ignored.insert(&&key);
    }

    var result: Summary = {
        counts: HashMap<String, usize>::new(),
        ...
    };
    for line in lines(input) {
        if line.as_str() == "" => continue;
        let fields = split_once(line.as_str(), " ")?;
        let duration = i64::parse(fields.after)?;
        let service = fields.before as String;
        if duration < minimum || ignored.contains(service) => continue;

        let count = result.counts.find_mut(service);
        if count != nullptr => ++*count;
        else => result.counts.insert(&&service, &&1);
        ++result.accepted;
    }
    return result;
}

test "threshold and ignored services follow the configuration" {
    let result = try {
        let config = TOMLValue::parse("minimum_ms = 20\\nignored = ['health']")?;
        summarize(config, "api 25\\nhealth 100\\napi 15\\n")?
    } catch {
        _ => fail("valid request records must be accepted"),
    };
    check(result.accepted == 1);
    check(result.counts.length() == 1);
}
`,
  orderPipeline: `import std::channel using ByteChannel;
import std::core using NumberParseError;
import std::utf using { lines, to_string, UTF8Error }

struct Summary {
    orders: i32,
    total: i32
}

async fn produce(queue: ByteChannel, &&orders: Vector<String>) {
    for order in orders {
        if order.as_str() == "" => continue;
        let bytes = Vector<u8>::from_slice(order.as_str().bytes);
        if !await queue.send(&&bytes) => return;
    }
    queue.close();
}

async fn process(&&orders: Vector<String>) -> Summary throw UTF8Error + NumberParseError {
    let queue = ByteChannel::new(1);
    async let producer = produce(queue, &&orders);
    var result: Summary = { ... };

    while {
        match await queue.receive() {
            .End => break,
            .Data(bytes) => {
                let text = to_string(bytes)?;
                result.total += i32::parse(text.as_str())?;
                ++result.orders;
            },
        }
    }
    await producer;
    return result;
}

async test "all queued orders are processed before the channel ends" {
    let result = try {
        await process(&&lines("1200\\n3000\\n"))?
    } catch {
        _ => fail("valid orders must be processed"),
    };
    check(result.orders == 2);
    check(result.total == 4200);
}

async test "an empty batch finishes without waiting for an order" {
    let result = try {
        await process(&&lines(""))?
    } catch {
        _ => fail("an empty order batch must finish"),
    };
    check(result.orders == 0);
    check(result.total == 0);
}
`,
  channelPipeline: `// A one-message queue makes the producer wait until a consumer drains it.
import std::async using yield_once;
import std::channel using ByteChannel;

async fn produce(queue: ByteChannel) {
    for amount in [12u8, 18u8, 30u8] {
        if !await queue.send(&&[amount]) => return;
    }
    queue.close();
}

async fn main() {
    let queue = ByteChannel::new(1);
    async let producer = produce(queue);
    await yield_once();

    // The first message fills the queue; the producer's second send is parked.
    println("Backpressure:", !queue.try_send(&&[99u8]));
    var (batches, total) = (0, 0);
    while {
        match await queue.receive() {
            .End => break,
            .Data(bytes) => {
                batches += 1;
                total += bytes[0] as i32;
            },
        }
    }
    await producer;
    println("Batches:", batches, "total:", total);
}
`,
  fileReport: `// In the Playground, these files live only in this invocation's filesystem.
import std::fs using { create_directories, read_text, write_text }
import std::toml using TOMLValue;

write_text(
    "release.toml",
    """
[release]
name = "storefront"
budget = 1000

[[artifact]]
path = "index.html"
bytes = 280

[[artifact]]
path = "app.js"
bytes = 420
"""
)?;

let input = read_text("release.toml")?;
let manifest = TOMLValue::parse(input.as_str())?;
let release = manifest.get("release")?;
let name = release.get("name")?;
let budget = release.get("budget")?.as_i64()?;
let artifacts = manifest.get("artifact")?;
var report = f"Release {name.as_str()?}\\n";
var total = 0i64;

for artifact in artifacts.elements()? {
    let path = artifact.get("path")?;
    let size = artifact.get("bytes")?.as_i64()?;
    report.append_format(f"{path.as_str()?}: {size} bytes\\n");
    total += size;
}

report.append_format(f"Total: {total} / {budget} bytes");

create_directories("reports")?;
write_text("reports/release.txt", report.as_str())?;
println(read_text("reports/release.txt")?);
`,
  asyncTests: `// Use Test to execute the runtime tests. Static tests run during checking too.
import std::async using { cancel_requested, close, yield_once }

const async fn subtotal(&&values: Vector<i32>) -> i32 {
    await yield_once();
    var total = 0;
    for value in values {
        total += value;
    }
    return total;
}

const async test "subtotal is checked during compilation" {
    check(await subtotal(&&Vector<i32>::from_slice([1, 2, 3])) == 6);
}

async test "independent batches keep their results" {
    async let first = subtotal(&&Vector<i32>::from_slice([1, 2, 3]));
    async let second = subtotal(&&Vector<i32>::from_slice([4, 5]));
    check(await first == 6);
    check(await second == 9);
}

async fn watch(&closed: bool) {
    while !cancel_requested() {
        await yield_once();
    }
    closed = true;
}

async test "closing a child completes its cleanup" {
    var closed = false;
    async let worker = watch(&closed);
    await yield_once();
    cancel worker;
    await close(worker);
    check(closed);
}
`,
} as const;
