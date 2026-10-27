export const extraExamples = {
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
}`,
  fileReport: `// In the Playground, these files live only in this invocation's filesystem.
import std::fs using { create_directories, read_text, write_text }
import std::toml using TOMLValue;

write_text("release.toml", """
[release]
name = "storefront"
budget = 1000

[[artifact]]
path = "index.html"
bytes = 280

[[artifact]]
path = "app.js"
bytes = 420
""")?;

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
println(read_text("reports/release.txt")?);`,
  asyncTests: `// Use Test to execute the runtime tests. Static tests run during checking too.
import std::async using { cancel_requested, close, yield_once }

const async fn subtotal(&&values: Vector<i32>) -> i32 {
    await yield_once();
    var total = 0;
    for value in values { total += value; }
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
    while !cancel_requested() { await yield_once(); }
    closed = true;
}

async test "closing a child completes its cleanup" {
    var closed = false;
    async let worker = watch(&closed);
    await yield_once();
    cancel worker;
    await close(worker);
    check(closed);
}`,
} as const;
