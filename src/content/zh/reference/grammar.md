---
title: 形式语法与优先级
description: 完整 EBNF 产生式、结合性、分隔规则和控制头部消歧。
section: reference
lesson: 20
source: docs/grammar.md
---

## 记法与适用方式

本附录列出当前语法文档中的全部 EBNF 块。引号表示终结符，大写名字表示 token，小写连字符名字表示非终结符；逗号表示连接，竖线表示选择，方括号表示可选，花括号表示重复，圆括号分组。where 后是补充语法谓词。产生式描述 token 次序，类型、访问与借用有效性由语义规则检查。

## 优先级

从低到高：访问表达式、区间表达式、逻辑或、逻辑与、按位或、异或、按位与、比较、移位、加减、乘除余、as、前缀、后缀。重复形式二元运算与 as 左结合；所有比较共用一个不可结合级别，不允许未加括号的链式比较。没有逗号表达式。

访问标记只能从 expression 的起点开始，覆盖其右侧完整表达式。普通二元 & 和 && 保持按位与/逻辑与含义。实参标记使用同一表达式机制，捕获与范围绑定另有只允许 & 的形式。

## 解析边界

语句开头未加括号的 if/match/try 是控制语句。分支普通表达式后接分号为语句，直接接结束大括号为分支结果。嵌套控制形式继承分支位置的语法角色。branch-block 不是独立可写的任意块表达式。

显式逗号列表仅在产生式允许时接一个尾逗号，尾逗号不产生空项。简写的 return/throw/rethrow/break/continue arm 不带分号，多条语句放入分支块。

T { ... } 解析为构造，T(...) 总解析为调用。控制头部外层深度遇到所需大括号时开始 body；想在该位置使用构造表达式，需要括号包裹。if、match、循环容器与整数范围边界都遵守这个规则。模式的 is、绑定标识符、case 与竖线不依赖名字查找消歧。

模块 import 是连续前缀。顶层 const 是模块常量；顶层可执行语句形成隐式入口。没有 namespace block、泛型声明、默认参数或可变参数语法。区间表达式 `a..b` 和 `a..=b` 不可连续结合，且必须提供两个整数端点。只有区间模式可以省略端点；不支持步长和隐式反向遍历。类型位置的非限定名 `range<T>` 表示整数区间。模式端点使用移位表达式，括号内可使用完整表达式；未加括号的 `|` 分隔模式分支。裸标识符绑定值，不表示检查一个已保存区间的成员关系。

## 01 · 记法

```text
production = term, term;
choice     = first | second;
optional   = [ element ];
repeated   = { element };
grouped    = ( first | second ), suffix;
```

## 02 · 源文本

```text
line-terminator = U+000A | U+000D, [ U+000A ];
horizontal-space = U+0020 | U+0009;
whitespace = horizontal-space | line-terminator;

line-comment = "//", { source-character - line-terminator },
               [ line-terminator ];
```

## 03 · 标识符

```text
ASCII_LETTER = "A" | ... | "Z" | "a" | ... | "z";
DIGIT        = "0" | ... | "9";

IDENTIFIER = ( ASCII_LETTER | "_" ),
             { ASCII_LETTER | DIGIT | "_" };
```

## 04 · 数字字面量

```text
HEX_DIGIT    = DIGIT | "a" | ... | "f" | "A" | ... | "F";
BINARY_DIGIT = "0" | "1";
OCTAL_DIGIT  = "0" | ... | "7";

decimal-exponent = ( "e" | "E" ), [ "+" | "-" ], DIGIT, { DIGIT };
decimal-digits = DIGIT, { DIGIT };

integer-suffix = "i8" | "i16" | "i32" | "i64"
               | "u8" | "u16" | "u32" | "u64"
               | "isize" | "usize";

floating-suffix = "f32" | "f64";

decimal-integer-literal = decimal-digits, [ integer-suffix ];

decimal-floating-core = decimal-digits, ".", decimal-digits,
                        [ decimal-exponent ]
                      | decimal-digits, decimal-exponent;

decimal-floating-literal = decimal-floating-core, [ floating-suffix ]
                         | decimal-digits, floating-suffix;

hexadecimal-literal = "0", ( "x" | "X" ), HEX_DIGIT, { HEX_DIGIT },
                      [ integer-suffix ];

binary-literal = "0", ( "b" | "B" ), BINARY_DIGIT, { BINARY_DIGIT },
                 [ integer-suffix ];

octal-literal = "0", ( "o" | "O" ), OCTAL_DIGIT, { OCTAL_DIGIT },
                [ integer-suffix ];

NUMBER_LITERAL = hexadecimal-literal
               | binary-literal
               | octal-literal
               | decimal-floating-literal
               | decimal-integer-literal;
```

## 05 · 文本字面量

```text
simple-escape = "\\'" | "\\\"" | "\\\\" | "\\n" | "\\t"
              | "\\r" | "\\0";

unicode-escape = "\\u{", HEX_DIGIT, { HEX_DIGIT }, "}"
                 where the hexadecimal digit count is at most six;

CHAR_LITERAL = "'",
               ( character-scalar | simple-escape | unicode-escape ),
               "'";

C_STRING_LITERAL = "c", STRING_LITERAL;  (* adjacent prefix; decoded NUL forbidden *)

STRING_LITERAL = "\"",
                 { string-scalar | simple-escape | unicode-escape },
                 "\"";
```

## 06 · 文本字面量

```text
interpolated-string = 'f"', { interpolation-text | interpolation-hole }, '"';
interpolation-hole = "{", expression, [ ":", format-specification ], "}";
format-specification = { format-text | interpolation-hole };
```

## 07 · C++ 头文件名

```text
CPP_ANGLE_HEADER_NAME = "<", cpp-angle-header-content, ">";
CPP_QUOTE_HEADER_NAME = "\"", cpp-quote-header-content, "\"";
cpp-angle-header-content = cpp-angle-header-character,
                           { cpp-angle-header-character };
cpp-angle-header-character = source-character - ">" - line-terminator;
cpp-quote-header-content = cpp-quote-header-character,
                           { cpp-quote-header-character };
cpp-quote-header-character = source-character - "\"" - line-terminator;
```

## 08 · C++ 源片段

```text
cpp-fence = "-", "-", "-", { "-" };

CPP_SOURCE_FRAGMENT = "#[cpp]",
                      horizontal-space, { horizontal-space },
                      cpp-fence, { horizontal-space }, line-terminator,
                      cpp-source-tail;
```

## 09 · 模块与顶层项

```text
source-module = { import-declaration },
              { top-level-item };

top-level-item = module-item
               | cpp-import-function-declaration
               | cpp-export-function-definition
               | test-declaration
               | CPP_SOURCE_FRAGMENT
               | statement;

(* A top-level const is always a module constant declaration. *)
module-item = [ visibility-modifier ], module-declaration;

visibility-modifier = "private" | "export";

module-declaration = enum-declaration
                   | struct-declaration
                   | function-definition
                   | module-constant-declaration;

cpp-import-function-declaration = [ "private" ],
                                  "import", "(", "cpp", ")",
                                  function-head, ";";

cpp-export-function-definition = "export", "(", "cpp", ")",
                                 function-head, function-body;

module-constant-declaration = "const", declaration-name,
                              [ ":", type ],
                              "=", expression, ";";

declaration-name = IDENTIFIER
                   where the token spelling is not "_";
```

## 10 · 导入

```text
import-declaration = module-import-declaration
                   | cpp-header-import-declaration;

module-import-declaration = "import", module-reference,
                            using-clause, ";";

cpp-header-import-declaration = "import",
                                ( CPP_ANGLE_HEADER_NAME
                                | CPP_QUOTE_HEADER_NAME ),
                                [ "using", cpp-import-selection ], ";";

cpp-name = IDENTIFIER, { "::", IDENTIFIER };
cpp-import-selection = using-list
                     | cpp-name, [ "::", ( using-list | "*" ) ];

module-reference = module-path
                 | ".", module-path
                 | module-component, "::", module-path;

module-component = IDENTIFIER | reserved-keyword;
module-path = module-component, { ".", module-component };

using-clause = "using", import-selection;

import-selection = IDENTIFIER | "*" | using-list;

using-list = "{", IDENTIFIER, { ",", IDENTIFIER }, [ "," ], "}";
```

## 11 · 枚举

```text
enum-declaration = "enum", IDENTIFIER,
                   [ ":", type ],
                   "{", enum-case-list, "}";

enum-case-list = enum-case, { ",", enum-case }, [ "," ];

enum-case = IDENTIFIER, [ enum-payload | "=", expression ];

enum-payload = "(", type, { ",", type }, [ "," ], ")";
```

## 12 · 结构体

```text
struct-declaration = "struct", IDENTIFIER,
                     "{", [ struct-field-list ], "}";

struct-field-list = struct-field,
                    { ",", struct-field },
                    [ "," ];

struct-field = IDENTIFIER, ":", type;
```

## 13 · 函数

```text
function-definition = function-head, function-body;

function-body = ordinary-block | "=>", expression, ";";

function-head = [ "const" ], "fn", IDENTIFIER,
                "(", [ parameter-list ], ")",
                [ "->", function-result-type ],
                [ throw-clause ];

parameter-list = parameter, { ",", parameter }, [ "," ];

parameter = [ access-marker ], binding-target, [ ":", type ];

access-marker = "&" | "&&";

function-result-type = type;

throw-clause = "throw", named-type, { "+", named-type };
```

## 14 · 测试

```text
test-declaration = [ "const" ], "test", STRING_LITERAL, test-block;

test-block = "{", { statement }, "}";
```

## 15 · 类型

```text
type = named-type | array-type | slice-type | function-type | pointer-type;

pointer-type = "ptr", "<", [ "&" ], type, ">";

named-type = qualified-type-name, [ "<", type, { ",", type }, ">" ];

qualified-type-name = [ "::" ], type-name-component,
                      { "::", type-name-component };

type-name-component = IDENTIFIER;

qualified-name = IDENTIFIER, { "::", IDENTIFIER };

array-type = "[", type, ";", expression, "]";

slice-type = "[", type, "]";

function-type = "fn",
                "(", [ function-type-parameter-list ], ")",
                "->", function-result-type,
                [ throw-clause ];

function-type-parameter-list = function-type-parameter,
                               { ",", function-type-parameter },
                               [ "," ];

function-type-parameter = [ access-marker ], type;
```

## 16 · 普通块

```text
ordinary-block = "{", { statement }, "}";
```

## 17 · 语句类别

```text
statement = variable-declaration
          | return-statement
          | throw-statement
          | rethrow-statement
          | break-statement
          | continue-statement
          | while-statement
          | for-statement
          | assignment-statement
          | update-statement
          | expression-statement
          | control-flow-statement;

assignment-statement = assignment-form, ";";

update-statement = update-form, ";";

expression-statement = expression, ";";

control-flow-statement = if-form | match-form | try-form;
```

## 18 · 赋值与更新

```text
assignment-form = expression, assignment-operator, expression;

assignment-operator = "=" | "+=" | "-=" | "*=" | "/=" | "%="
                    | "&=" | "|=" | "^=" | "<<=" | ">>=";

update-form = update-operator, prefix-expression;

update-operator = "++" | "--";
```

## 19 · 变量声明

```text
variable-declaration = variable-declaration-head, ";";

variable-declaration-head = binding-kind, binding-target,
                            [ ":", type ],
                            "=", expression;

binding-kind = "let" | "var" | "const";

binding-target = IDENTIFIER;
```

## 20 · 控制转移

```text
return-statement = "return", [ expression ], ";";

throw-statement = "throw", expression, ";";

rethrow-statement = "rethrow", ";";

break-statement = "break", ";";

continue-statement = "continue", ";";
```

## 21 · while

```text
while-statement = "while", expression, ordinary-block;
```

## 22 · for

```text
for-statement = "for", for-header, ordinary-block;

for-header = range-for-header | c-style-for-header;

range-for-header = for-binding, "in", range-for-source;

range-for-source = expression;

for-binding = [ "&" ], binding-target, [ ":", type ];

c-style-for-header = [ for-initializer ], ";",
                         [ expression ], ";",
                         [ for-step-list ];

for-initializer = variable-declaration-head
                | assignment-form
                | expression;

for-step-list = for-step, { ",", for-step };

for-step = assignment-form | update-form | expression;
```

## 23 · 分支块

```text
branch-block = "{", { statement }, [ branch-result ], "}";

branch-result = expression;
```

## 24 · 表达式优先级

```text
expression = access-expression | range-expression;

range-expression = logical-or-expression,
                   [ ( ".." | "..=" ), logical-or-expression ];

access-expression = access-marker, expression;

logical-or-expression = logical-and-expression,
                        { "||", logical-and-expression };

logical-and-expression = bitwise-or-expression,
                         { "&&", bitwise-or-expression };

bitwise-or-expression = bitwise-xor-expression,
                        { "|", bitwise-xor-expression };

bitwise-xor-expression = bitwise-and-expression,
                         { "^", bitwise-and-expression };

bitwise-and-expression = comparison-expression,
                         { "&", comparison-expression };

comparison-expression = shift-expression,
                        [ comparison-operator, shift-expression ];

comparison-operator = "==" | "!=" | "<" | "<=" | ">" | ">=";

shift-expression = additive-expression,
                   { ( "<<" | ">>" ), additive-expression };

additive-expression = multiplicative-expression,
                      { ( "+" | "-" ), multiplicative-expression };

multiplicative-expression = cast-expression,
                            { ( "*" | "/" | "%" ), cast-expression };

cast-expression = prefix-expression,
                  { "as", type };
```

## 25 · 前缀表达式

```text
prefix-expression = prefix-operator, prefix-expression
                  | postfix-expression;

prefix-operator = "!" | "-" | "~" | "*";
```

## 26 · 后缀表达式

```text
postfix-expression = primary-expression, { postfix-operation };

postfix-operation = call-operation
                  | index-operation
                  | member-operation
                  | propagation-operation;

call-operation = "(", [ argument-list ], ")";

argument-list = call-argument, { ",", call-argument }, [ "," ];

call-argument = expression;

index-operation = "[", expression, "]";

member-operation = ( "." | "::" | "->" ), IDENTIFIER;

propagation-operation = "?";
```

## 27 · 基础表达式

```text
primary-expression = interpolated-string
                   | literal
                   | construction-expression
                   | contextual-case-expression
                   | IDENTIFIER
                   | global-cpp-name
                   | grouped-expression
                   | array-expression
                   | lambda-expression
                   | if-form
                   | match-form
                   | try-form;

literal = NUMBER_LITERAL | STRING_LITERAL | C_STRING_LITERAL | CHAR_LITERAL
        | "true" | "false" | "nullptr";

global-cpp-name = "::", IDENTIFIER, { "::", IDENTIFIER };

contextual-case-expression = ".", IDENTIFIER;

grouped-expression = "(", expression, ")";

construction-expression = construction-type,
                          "{", [ construction-initializer-list ], "}";

construction-type = named-type | function-type;

construction-initializer-list = positional-initializer-list
                              | field-initializer-list;

positional-initializer-list = expression,
                              { ",", expression },
                              [ "," ];

field-initializer-list = field-initializer,
                         { ",", field-initializer },
                         [ "," ];

field-initializer = IDENTIFIER, ":", expression;

array-expression = "[", [ array-element-list ], "]";

array-element-list = expression,
                     { ",", expression },
                     [ "," ];

lambda-expression = "[", [ capture-list ], "]",
                    "(", [ lambda-parameter-list ], ")",
                    [ "->", type ], [ throw-clause ],
                    ( ordinary-block | "=>", expression );

capture-list = capture, { ",", capture }, [ "," ];
capture = [ "&" ], IDENTIFIER;

lambda-parameter-list = parameter, { ",", parameter }, [ "," ];
```

## 28 · 条件形式

```text
if-form = "if", expression, branch-block,
          { "else", "if", expression, branch-block },
          [ "else", branch-block ];
```

## 29 · try 与 catch

```text
try-form = "try", branch-block, "catch", "{", [ catch-arm-list ], "}";
catch-arm-list = catch-arm, { ",", catch-arm }, [ "," ];
catch-arm = catch-pattern, [ "if", expression ], "=>", match-arm-body;
catch-pattern = catch-atom, { "|", catch-atom };
catch-atom = "_" | named-type, "(", pattern, ")";
```

## 30 · match 与模式

```text
match-form = "match", expression,
             "{", [ match-arm-list ], "}";

match-arm-list = match-arm, { ",", match-arm }, [ "," ];

match-arm = pattern, [ "if", expression ], "=>", match-arm-body;

pattern = or-pattern;

or-pattern = atomic-pattern, { "|", atomic-pattern };

atomic-pattern = wildcard-pattern
               | literal-pattern
               | negative-number-pattern
               | binding-pattern
               | constraint-pattern
               | case-pattern
               | range-pattern;

range-pattern = shift-expression, "..", [ shift-expression ]
              | "..", shift-expression
              | [ shift-expression ], "..=", shift-expression;

wildcard-pattern = "_";

literal-pattern = NUMBER_LITERAL | STRING_LITERAL | C_STRING_LITERAL | CHAR_LITERAL
                | "true" | "false";

negative-number-pattern = "-", NUMBER_LITERAL;

binding-pattern = IDENTIFIER;

case-pattern = case-name, [ "(", [ pattern-list ], ")" ];

case-name = ".", IDENTIFIER
          | qualified-name, "::", IDENTIFIER;

pattern-list = pattern, { ",", pattern }, [ "," ];

constraint-pattern = "is", constraint-operand;

constraint-operand = qualified-name | array-type;
```

## 31 · arm body

```text
match-arm-body = match-expression-arm
               | control-transfer-form
               | branch-block;

control-transfer-form = return-form | throw-form | "rethrow"
                      | "break" | "continue";

return-form = "return", [ expression ];

throw-form = "throw", expression;

match-expression-arm = expression;
```
