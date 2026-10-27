export const pricingSource = `struct Quote {
    subtotal: i32,
    saved: i32,
    total: i32,
}

fn discounted(price: i32, percent: i32) -> i32 =>
    price * (100 - percent) / 100;

fn quote(price: i32, percent: i32) -> Quote {
    let total = discounted(price, percent);
    return { subtotal: price, saved: price - total, total: total };
}

test "discounted price" {
    check(discounted(1200, 0) == 1200);
    check(discounted(1200, 25) == 900);
}

test "quote keeps the original amount" {
    let result = quote(1200, 25);
    check(result.subtotal == result.saved + result.total);
}`;

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
println("Order total:", result.total);`,
    files: { 'pricing.cv': pricingSource },
    selectedFile: 'pricing.cv',
    stdin: '',
  },
  {
    id: 'workspace-report',
    producesFiles: true,
    title: { en: 'Read files and standard input', zh: '读取文件与标准输入' },
    description: {
      en: 'Read a title from standard input and items from a file. Edit either input, run the program, then open or download the generated report.',
      zh: '从标准输入读取标题，从文件读取条目。修改任意输入后运行程序，即可查看或下载生成的报告。',
    },
    defaultView: 'files',
    source: `import std::fs using { read_text, write_text, FileError }
import std::io using IOError;

async fn main() throw FileError + IOError {
    let fallback: String = "Release checklist";
    let title = match await stdin().read_line()? {
        .Data(text) => text,
        .End => fallback,
    };
    let items = read_text("items.txt")?;
    let report = f"{title}\\n====================\\n{items}";
    write_text("report.txt", report.as_str())?;
    println("Saved report.txt");
}`,
    files: { 'items.txt': 'Website updated\nInline tests passed\nReady for review\n' },
    selectedFile: 'main.cv',
    stdin: 'Carven 0.1.0 release\n',
  },
] as const;

export interface WorkspacePreset {
  source: string;
  producesFiles?: boolean;
  files?: Record<string, string>;
  selectedFile?: string;
  stdin?: string;
}
