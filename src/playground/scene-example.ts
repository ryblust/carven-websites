export const viewTypes = `struct Bar {
    label: String,
    value: i32
}

struct ViewNode {
    id: i32,
    kind: String,
    title: String,
    text: String,
    value: i32,
    bars: Vector<Bar>,
}

struct Scene {
    title: String,
    subtitle: String,
    columns: i32,
    nodes: Vector<ViewNode>,
}

fn localized(language: i32, english: String, chinese: String) -> String => match language {
    1 => chinese,
    _ => english
};

fn selection_hint(selected: i32, language: i32) -> String => match selected {
    1 => localized(
        language,
        "Input selected. Try changing its calculation.",
        "已选中输入值，试试修改它的计算规则。"
    ),
    2 => localized(
        language,
        "Mapped value selected. It follows the input.",
        "已选中映射结果，它会随输入值变化。"
    ),
    3 => localized(
        language,
        "Chart selected. Try adding another bar.",
        "已选中图表，试试再加一条数据。"
    ),
    _ => localized(
        language,
        "Select a component to see the model respond.",
        "点击组件，查看模型如何响应你的选择。"
    ),
};

fn metric(id: i32, title: String, value: i32) -> ViewNode => {
    id: id,
    kind: "metric",
    title: title,
    value: value,
    ...
};

fn chart(id: i32, title: String, bars: Vector<Bar>) -> ViewNode => {
    id: id,
    kind: "bars",
    title: title,
    bars: bars,
    ...
};

fn note(id: i32, title: String, text: String) -> ViewNode => {
    id: id,
    kind: "note",
    title: title,
    text: text,
    ...
};
`;

export const sceneSource = `import .ui using { Scene, ViewNode, metric, chart, note, localized, selection_hint }

// language: 0 = English, 1 = 中文
fn model(value: i32, selected: i32, language: i32, columns: i32, details: i32) -> Scene {
    let text = [language](english: String, chinese: String) =>
        localized(language, english, chinese);
    let focus = selection_hint(selected, language);

    var nodes: Vector<ViewNode> = [
        metric(1, text("Current input", "当前输入"), value),
        metric(2, text("Mapped value", "映射结果"), value * 12),
        chart(
            3,
            text("Data mappings", "数据映射"),
            [
                {
                    label: text("Linear", "原值"),
                    value: value
                },
                {
                    label: text("Three quarters", "四分之三"),
                    value: value * 3 / 4
                },
                {
                    label: text("Half", "二分之一"),
                    value: value / 2
                },
            ]
        ),
    ];
    if details != 0 {
        nodes.push(note(4, text("Selection notes", "交互提示"), focus));
    }

    return {
        title: text("Component canvas", "组件画布"),
        subtitle: text(
            "Components described in Carven, rendered by React.",
            "用 Carven 描述组件，由 React 呈现。"
        ),
        columns: columns,
        nodes: nodes,
    };
}

fn view(value: i32, selected: i32, language: i32) -> Scene =>
    model(value, selected, language, 2, 1);

test "the view responds to value" {
    let scene = view(80, 0, 0);
    check(scene.nodes[0].value == 80);
    check(scene.nodes[2].bars[1].value == 60);
}

test "component identities stay stable" {
    check(model(20, 1, 0, 2, 1).nodes[0].id == model(80, 1, 1, 3, 0).nodes[0].id);
}
`;

export const sceneExample = {
  id: 'component-studio',
  title: { en: 'Build a live component view', zh: '构建实时组件视图' },
  description: {
    en: 'Edit components, chart data, or the layout in scene.cv. The preview updates automatically and keeps your inputs and selection. Run the adjacent inline tests from the Tests view.',
    zh: '修改 scene.cv 中的组件、图表数据或布局，预览会自动更新，并保留输入与选中项。切到「测试结果」即可运行旁边的内联测试。',
  },
  defaultView: 'preview',
  source: `import .scene using view;

let scene = view(60, 0, 0);
println(scene.title);
println("Components:", scene.nodes.length());
`,
  files: { 'scene.cv': sceneSource, 'ui.cv': viewTypes },
  selectedFile: 'scene.cv',
} as const;
