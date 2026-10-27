import { sceneExample } from './scene-example.ts';

export const releaseReportSource = `import std::toml using { TOMLValue, TOMLValueError }

struct BudgetExceeded {
    total: i64,
    budget: i64
}

fn release_report(title: str, manifest: TOMLValue) -> String throw TOMLValueError + BudgetExceeded {
    let release = manifest.get("release")?;
    let name = release.get("name")?;
    let budget = release.get("budget")?.as_i64()?;
    let artifacts = manifest.get("artifact")?;
    var report = f"{title}\\nRelease {name.as_str()?}\\n";
    var total = 0i64;

    for artifact in artifacts.elements()? {
        let path = artifact.get("path")?;
        let size = artifact.get("bytes")?.as_i64()?;
        report.append_format(f"{path.as_str()?}: {size} bytes\\n");
        total += size;
    }
    if total > budget => throw BudgetExceeded { total, budget };

    report.append_format(f"Total: {total} / {budget} bytes\\n");
    return report;
}

test "a release above its budget is rejected" {
    try {
        let manifest = TOMLValue::parse("""
            [release]
            name = "storefront"
            budget = 100
            [[artifact]]
            path = "app.js"
            bytes = 120
            """)?;
        release_report("Release review", manifest)?;
        fail("expected the budget check to reject this release");
    } catch {
        BudgetExceeded(error) => check(error.total == 120),
        _ => fail("expected a budget failure"),
    }
}
`;

export const pricingSource = `struct Quote {
    subtotal: i32,
    saved: i32,
    total: i32,
}

fn discounted(price: i32, percent: i32) -> i32 => price * (100 - percent) / 100;

fn quote(price: i32, percent: i32) -> Quote {
    let total = discounted(price, percent);
    return {
        subtotal: price,
        saved: price - total,
        total: total
    };
}

test "discounted price" {
    check(discounted(1200, 0) == 1200);
    check(discounted(1200, 25) == 900);
}

test "quote keeps the original amount" {
    let result = quote(1200, 25);
    check(result.subtotal == result.saved + result.total);
}
`;

export const workspaceExamples = [
  {
    id: 'pricing-preview',
    title: { en: 'Call a pricing rule from the page', zh: '从网页调用定价规则' },
    description: {
      en: 'Change the order inputs and call a Carven function from the page. Edit the pricing rule, then test the same source with its inline tests.',
      zh: '修改订单参数，由网页调用 Carven 函数。也可以修改定价规则，再运行同一份源码旁的内联测试。',
    },
    defaultView: 'preview',
    source: `import .pricing using quote;

let result = quote(1200, 25);
println("Order total:", result.total);
`,
    files: { 'pricing.cv': pricingSource },
    selectedFile: 'pricing.cv',
    stdin: '',
  },
  {
    id: 'workspace-report',
    producesFiles: true,
    title: { en: 'Review a release against its budget', zh: '检查发布清单与体积预算' },
    description: {
      en: 'Read a TOML release manifest and a title from standard input. Check the artifact budget, save a report, and test the same rule beside its source.',
      zh: '读取 TOML 发布清单和标准输入中的标题，检查产物体积预算，再生成报告。内联测试就在同一份规则源码旁。',
    },
    defaultView: 'files',
    source: `import std::fs using { read_text, write_text, FileError }
import std::io using IOError;
import std::toml using { TOMLValue, TOMLError, TOMLValueError }
import .report using { release_report, BudgetExceeded }

async fn main() throw FileError + IOError + TOMLError + TOMLValueError + BudgetExceeded {
    let fallback: String = "Release checklist";
    let title = match await stdin().read_line()? {
        .Data(text) => text,
        .End => fallback,
    };
    let text = read_text("release.toml")?;
    let manifest = TOMLValue::parse(text.as_str())?;
    let report = release_report(title.as_str(), manifest)?;
    write_text("report.txt", report.as_str())?;
    println("Saved report.txt");
}
`,
    files: {
      'report.cv': releaseReportSource,
      'release.toml': `[release]
name = "storefront"
budget = 524288

[[artifact]]
path = "index.html"
bytes = 7840

[[artifact]]
path = "app.js"
bytes = 286720

[[artifact]]
path = "styles.css"
bytes = 19456

[[artifact]]
path = "fonts.woff2"
bytes = 98304
`,
    },
    selectedFile: 'main.cv',
    stdin: 'Carven 0.1.0 release\n',
  },
  sceneExample,
] as const;

export interface WorkspacePreset {
  source: string;
  producesFiles?: boolean;
  files?: Record<string, string>;
  selectedFile?: string;
  stdin?: string;
}
