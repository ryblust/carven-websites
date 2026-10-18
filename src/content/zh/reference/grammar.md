---
title: "语法与优先级"
description: 完整 EBNF 产生式、结合性、分隔规则和控制头部消歧。
section: reference
lesson: 25
source: docs/language/grammar.md
---

## 记号与使用

需要确认 token 的准确顺序，或判断一段代码如何解析时，查阅本附录。日常写法与例子可从[参考目录](/zh/reference/)进入对应主题。下面的 EBNF 描述语法，类型、所有权与失败规则继续决定语法正确的程序是否有效。

下文按词法、声明、类型、语句和表达式列出产生式。标准类型名是普通绑定，可通过导入别名访问或被遮蔽。函数与名义类型支持类型参数及失败集合参数；元组绑定目标与模式可递归，`()` 表示单元值，异步形式使用其对应产生式。

## 优先级

从低到高为访问表达式、区间、逻辑或、逻辑与、按位或、异或、按位与、比较、移位、加减、乘除余、as、前缀和后缀。重复二元形式与 as 左结合；比较共用非结合层，未分组的比较链非法。没有逗号表达式。访问标记只能从表达式产生式的起点开始，并覆盖右侧完整表达式；中缀 &/&& 仍为位与/逻辑与。

## 解析边界

语句开头未加括号的 if/match/try 是完整控制语句。分支内表达式后有分号是语句，直接跟右花括号是结果候选；嵌套控制继承所在位置的语法角色。branch-block 不是一般块表达式。各逗号列表仅在产生式明确允许时可有一个尾逗号，尾逗号不创建空项；简写的 return/throw/rethrow/break/continue 分支不带分号，多条语句使用分支块。

T { ... } 显式构造，省略类型的 { ... } 仅接受具名字段或空初始化器，需要期望类型。在 match/catch 分支开头，左花括号后若为 IDENTIFIER : 则为构造，否则为分支块；因此 {} 是空块，({}) 才是空构造。函数和控制体仍是块。T(...) 总解析为调用，不依赖名字含义。

控制语句头部后面需要紧接语句体，因此在头部最外层遇到的 { 始终表示语句体开始；要在这里使用构造表达式，须加括号。此规则同样适用于 if、match、循环的遍历源、区间边界，以及 C 风格 for 的最后一个步进表达式。is 总开始约束模式；裸名字是绑定，不查询符号表；.Case/Owner::Case 是 case 模式，语义再检查身份与元数。模式中的 | 属于或模式，不是位或。

## 异步、元组与泛型

await action()? 的 ? 作用于等待后的完成结果；await (action()?) 的传播位于操作数内。要对等待结果取成员/索引或调用须写 (await action()).member；await action().member 的后缀属于被等待的操作数。async let 要求单个具名目标，cancel 语句命名当前作用域内的子任务。const async fn 与 async const fn 表示同样两种修饰。

(value) 分组，(value,) 单元素元组，() 为单元值，类型与模式使用同样区分。递归元组目标与 Write 绑定是否合法，以及所有权和穷尽性是否满足要求，由语义检查决定；位置字段须无前导零的十进制整数。泛型类型实参和失败集合实参分别使用普通类型与 throw 子句种类。

## 01 · 记号

```text
production = term, term;
choice     = first | second;
optional   = [ element ];
repeated   = { element };
grouped    = ( first | second ), suffix;
```

记号含义如下：

- 引号内的文本是终结符拼写。
- `UPPER_SNAKE_CASE` 名字表示词法 token，`lower-kebab-case` 名字表示语法非终结符。
- `,` 表示连接，`|` 表示选择。
- `[ x ]` 表示零次或一次，`{ x }` 表示零次或多次。
- `( x )` 为记号分组；引号中的括号则是源代码字符。
- `where` 后的说明给出产生式额外要求的语法条件。

## 02 · 源文本

```text
line-terminator = U+000A | U+000D, [ U+000A ];
horizontal-space = U+0020 | U+0009;
whitespace = horizontal-space | line-terminator;

line-comment = "//", { source-character - line-terminator },
               [ line-terminator ];
```

所有源码（包括 C++ 源片段）都必须是有效 UTF-8。标识符只使用 ASCII；Unicode 字符可出现在注释、字符串、C++ 头文件名和源片段中。普通空白与行注释在词法分析后丢弃，字面量和源片段内部内容按各自规则保留。普通 Carven 源码没有块注释，C++ 源片段的内容不按 Carven token 解析。

## 03 · 标识符

```text
ASCII_LETTER = "A" | ... | "Z" | "a" | ... | "z";
DIGIT        = "0" | ... | "9";

IDENTIFIER = ( ASCII_LETTER | "_" ),
             { ASCII_LETTER | DIGIT | "_" };
```

## 04 · 保留关键字与名字

```text
reserved-keyword = "as" | "async" | "await" | "break" | "cancel" | "catch"
                 | "class" | "const" | "continue" | "else" | "enum" | "export"
                 | "false" | "fn" | "for" | "if" | "import" | "in" | "is"
                 | "let" | "match" | "nullptr" | "private" | "rethrow"
                 | "return" | "struct" | "test" | "throw" | "true" | "try"
                 | "using" | "var" | "while";

identifier-shaped-name = IDENTIFIER | reserved-keyword;
```

## 05 · 数值字面量

```text
HEX_DIGIT    = DIGIT | "a" | ... | "f" | "A" | ... | "F";
BINARY_DIGIT = "0" | "1";
OCTAL_DIGIT  = "0" | ... | "7";

decimal-exponent = ( "e" | "E" ), [ "+" | "-" ], DIGIT, { DIGIT };
decimal-digits = DIGIT, { DIGIT };

integer-suffix = "i8" | "i16" | "i32" | "i64"
               | "u8" | "u16" | "u32" | "u64"
               | "isize" | "usize"
               | "ns" | "us" | "ms" | "s";

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

## 06 · 文本字面量

```text
simple-escape = "\\'" | "\\\"" | "\\\\" | "\\n" | "\\t"
              | "\\r" | "\\0";

unicode-escape = "\\u{", HEX_DIGIT, { HEX_DIGIT }, "}"
                 where the hexadecimal digit count is at most six;

CHAR_LITERAL = "'",
               ( character-scalar | simple-escape | unicode-escape ),
               "'";

C_STRING_LITERAL = "c", single-line-string;  (* adjacent prefix; decoded NUL forbidden *)

single-line-string = "\"",
                 { string-scalar | simple-escape | unicode-escape },
                 "\"";

STRING_LITERAL = single-line-string | multiline-string | raw-string;
```

字符与单行字符串必须在起始行结束。字符解码后恰好有一个 Unicode 标量；Unicode 转义允许 U+0000 到 U+10FFFF，但排除代理项 U+D800 到 U+DFFF。字面量不执行 Unicode 归一化，也不隐式拼接相邻字符串。

`multiline-string` 用三引号开始，后面紧接 LF 或 CRLF。结束三引号位于单独一行，可有前导空格或制表符，结束后可接普通代码。解码移除公共缩进，并把物理换行规范为 LF。

`raw-string` 用紧邻的 `r`、零个或多个 `#`、一个或三个引号开始；结束定界符使用相同引号数与井号数。单引号形式为单行，三引号形式遵循多行布局。正文不处理转义或插值。各文本形式的例子见[词法与字面量](/zh/reference/lexical/#字符和字符串)。

## 07 · 插值

```text
interpolated-string = 'f"', { interpolation-text | interpolation-hole }, '"'
                    | 'f"""', multiline-interpolation-body, '"""';
interpolation-hole = "{", expression, [ ":", format-specification ], "}";
format-specification = { format-text | interpolation-hole };
```

## 08 · C++ 头文件名

```text
CPP_ANGLE_HEADER_NAME = "<", cpp-angle-header-content, ">";
CPP_QUOTE_HEADER_NAME = "\"", cpp-quote-header-content, "\"";
cpp-angle-header-content = cpp-angle-header-character,
                           { cpp-angle-header-character };
cpp-angle-header-character = source-character - ">" - line-terminator - U+0000;
cpp-quote-header-content = cpp-quote-header-character,
                           { cpp-quote-header-character };
cpp-quote-header-character = source-character - "\"" - line-terminator - U+0000;
```

## 09 · C++ 源片段

```text
cpp-fence = "-", "-", "-", { "-" };

CPP_SOURCE_FRAGMENT = "#[cpp]",
                      horizontal-space, { horizontal-space },
                      cpp-fence, { horizontal-space }, line-terminator,
                      cpp-source-tail;
```

## 标点符号

词法分析使用最长匹配。标点符号集合如下：

```text
( ) [ ] { } , . .. ..= : ;
+ - * / % ! ? = < > & | ^ ~
+= -= *= /= %= != == <= >= ++ --
&& || << >> &= |= ^= <<= >>=
-> => ::
```

## 10 · 模块与顶层项

```text
source-module = { import-declaration },
              { top-level-item };

top-level-item = module-item
               | cpp-import-function-declaration
               | cpp-export-function-definition
               | test-declaration
               | CPP_SOURCE_FRAGMENT
               | statement;

(* A top-level const binding is a module constant declaration;
   const test introduces a test, const { a const block,
   const if a conditional, and const for a loop. *)
module-item = [ visibility-modifier ], module-declaration;

visibility-modifier = "private" | "export";

module-declaration = enum-declaration
                   | struct-declaration
                   | class-declaration
                   | function-definition
                   | module-constant-declaration;

cpp-import-function-declaration = [ "private" ],
                                  "import", "(", "cpp", ")",
                                  function-head, [ "=", cpp-function-target ], ";";

cpp-function-target = "::", cpp-name;

cpp-export-function-definition = "export", "(", "cpp", ")",
                                 function-head, function-body;

module-constant-declaration = "const", declaration-name,
                              [ ":", type ],
                              "=", expression, ";";

declaration-name = IDENTIFIER
                   where the token spelling is not "_";
```

## 11 · 导入

```text
import-declaration = module-import-declaration
                   | cpp-header-import-declaration;

module-import-declaration = "import", module-reference,
                            using-clause, ";";

cpp-header-import-declaration = "import",
                                ( CPP_ANGLE_HEADER_NAME
                                | CPP_QUOTE_HEADER_NAME ),
                                [ "using", cpp-import-selection ], ";";

cpp-name = identifier-shaped-name, { "::", identifier-shaped-name };
cpp-import-selection = cpp-using-list
                     | cpp-name, [ "::", ( cpp-using-list | "*" ) ];

cpp-using-list = "{", identifier-shaped-name,
                 { ",", identifier-shaped-name }, [ "," ], "}";

module-reference = module-path
                 | ".", module-path
                 | module-component, "::", module-path;

module-component = IDENTIFIER | reserved-keyword;
module-path = module-component, { ".", module-component };

using-clause = "using", import-selection;

import-selection = import-item | "*" | using-list;
import-item = IDENTIFIER, [ "as", IDENTIFIER ];

using-list = "{", import-item, { ",", import-item }, [ "," ], "}";
```

在提供下列模块与原生头文件的编译批次中，可以使用这些导入形式：

```carven
import math using answer;
import .math using *;
import json::parser using parse;
import geometry.vector using { Point, length };
import <cstdint>;
import "native/provider.hpp";
```

## 12 · 枚举

```text
enum-declaration = "enum", IDENTIFIER, [ type-parameter-clause ],
                   [ ":", type ],
                   "{", enum-case-list, "}";

enum-case-list = enum-case, { ",", enum-case }, [ "," ];

enum-case = IDENTIFIER, [ enum-payload | "=", expression ];

enum-payload = "(", type, { ",", type }, [ "," ], ")";
```

## 13 · 结构体

```text
struct-declaration = "struct", IDENTIFIER, [ type-parameter-clause ],
                     "{", [ struct-field-list ], "}";

struct-field-list = struct-field,
                    { ",", struct-field },
                    [ "," ];

struct-field = IDENTIFIER, ":", type;
```

## 14 · 类操作

```text
class-declaration = "class", IDENTIFIER, [ type-parameter-clause ],
                    "{", { class-member }, "}";
class-member = struct-field, ","
             | [ "private" ], class-operation;
class-operation = [ function-modifier ], "fn", IDENTIFIER, [ type-parameter-clause ],
                  "(", [ class-parameter-list ], ")",
                  [ "->", function-result-type ], [ throw-clause ], function-body;
class-parameter-list = receiver, [ ",", [ function-parameter-list ] ]
                     | function-parameter-list;
receiver = [ "&" | "&&" ], "self";
```

## 15 · 函数

```text
function-definition = function-head, function-body;

function-body = ordinary-block | "=>", expression, ";";

function-head = [ function-modifier ], "fn", IDENTIFIER, [ type-parameter-clause ],
                "(", [ function-parameter-list ], ")",
                [ "->", function-result-type ],
                [ throw-clause ];

function-modifier = "const", [ "async" ] | "async", [ "const" ];

function-parameter-list = function-parameter,
                          { ",", function-parameter }, [ "," ];

function-parameter = parameter
                   | "const", binding-target, [ ":", type ];

parameter = [ access-marker ], binding-target, [ ":", type ];

access-marker = "&" | "&&";

function-result-type = type;

throw-clause = "throw", ( "(", ")" | named-type, { "+", named-type } );
```

## 16 · 泛型参数与实参

```text
type-parameter-clause = "<", generic-parameter,
                        { ",", generic-parameter }, [ "," ], ">";
generic-parameter = [ "throw" ], IDENTIFIER;
```

## 17 · 测试

```text
test-declaration = [ "const" ], "test", [ STRING_LITERAL ], test-block;

test-block = "{", { statement }, "}";
```

## 18 · 类型

```text
type = named-type | array-type | slice-type | tuple-type
     | grouped-type | function-type | pointer-type;

grouped-type = "(", type, ")";

tuple-type = "(", ")"
           | "(", type-list-element, ",",
             [ type-list-element, { ",", type-list-element }, [ "," ] ], ")";

type-list-element = type;

pointer-type = "ptr", "<", [ "&" ], type, ">";

named-type = qualified-type-name, [ type-arguments ];

type-arguments = "<", generic-argument,
                 { ",", generic-argument }, [ "," ], ">";
generic-argument = type | throw-clause;

qualified-type-name = IDENTIFIER, { "::", identifier-shaped-name }
                    | "::", identifier-shaped-name,
                      { "::", identifier-shaped-name };

qualified-name = IDENTIFIER, { "::", identifier-shaped-name };

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

## 19 · 语句块

```text
ordinary-block = "{", { statement }, "}";
```

## 20 · 语句类别

```text
statement = variable-declaration
          | const-block
          | return-statement
          | throw-statement
          | rethrow-statement
          | break-statement
          | continue-statement
          | cancel-statement
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

const-block = "const", [ STRING_LITERAL ], ordinary-block;
```

## 21 · 赋值与更新

```text
assignment-form = expression, assignment-operator, expression;

assignment-operator = "=" | "+=" | "-=" | "*=" | "/=" | "%="
                    | "&=" | "|=" | "^=" | "<<=" | ">>=";

update-form = update-operator, prefix-expression;

update-operator = "++" | "--";
```

## 22 · 绑定声明

```text
variable-declaration = variable-declaration-head, ";";

variable-declaration-head = binding-kind, binding-target,
                            [ ":", type ],
                            "=", expression;

binding-kind = "let" | "var" | "const" | "async", "let";

named-binding-target = IDENTIFIER;

binding-target = named-binding-target
               | "(", binding-target, ")"
               | tuple-binding-target;

tuple-binding-target = "(", ")"
                     | "(", binding-target, ",",
                       [ binding-target, { ",", binding-target }, [ "," ] ], ")";
```

## 23 · 控制转移与取消

```text
return-statement = "return", [ expression ], ";";

throw-statement = "throw", expression, ";";

rethrow-statement = "rethrow", ";";

break-statement = "break", ";";

continue-statement = "continue", ";";

cancel-statement = "cancel", IDENTIFIER, ";";
```

## 24 · while

```text
while-statement = "while", [ expression ], ordinary-block;
```

## 25 · for

```text
for-statement = "const", "for", range-for-header, ordinary-block
              | "for", for-header, ordinary-block;

for-header = range-for-header | c-style-for-header;

range-for-header = for-binding, "in", range-for-source;

range-for-source = expression;

for-binding = [ "&" ], binding-target, [ ":", type ];

c-style-for-header = [ for-initializer ], ";",
                         expression, ";",
                         [ for-step-list ];

for-initializer = variable-declaration-head
                | assignment-form
                | expression;

for-step-list = for-step, { ",", for-step };

for-step = assignment-form | update-form | expression;
```

## 26 · 分支块

```text
branch-block = "{", { statement }, [ branch-result ], "}";

branch-result = expression;
```

## 27 · 表达式优先级

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

## 28 · 前缀与 await

```text
prefix-expression = prefix-operator, prefix-expression
                  | await-expression
                  | postfix-expression;

prefix-operator = "!" | "-" | "~" | "*";

await-expression = "await", await-operand, { propagation-operation };

await-operand = prefix-operator, await-operand
              | "await", await-operand
              | nonpropagating-postfix-expression;

nonpropagating-postfix-expression = primary-expression,
                                   { call-operation | index-operation
                                   | member-operation };
```

## 29 · 后缀表达式

```text
postfix-expression = primary-expression, { postfix-operation };

postfix-operation = call-operation
                  | type-arguments
                  | index-operation
                  | member-operation
                  | propagation-operation;

call-operation = "(", [ argument-list ], ")";

argument-list = call-argument, { ",", call-argument }, [ "," ];

call-argument = expression-list-element;

expression-list-element = expression;

index-operation = "[", expression, "]";

member-operation = ( "." | "::" | "->" ), identifier-shaped-name
                 | ( "." | "->" ), tuple-position;

tuple-position = "0" | NONZERO_DECIMAL_DIGIT, { DECIMAL_DIGIT };

propagation-operation = "?";
```

## 30 · 主表达式

```text
primary-expression = interpolated-string
                   | literal
                   | construction-expression
                   | contextual-case-expression
                   | IDENTIFIER
                   | global-cpp-name
                   | grouped-expression
                   | tuple-expression
                   | array-expression
                   | lambda-expression
                   | if-form
                   | match-form
                   | try-form;

literal = NUMBER_LITERAL | STRING_LITERAL | C_STRING_LITERAL | CHAR_LITERAL
        | "true" | "false" | "nullptr";

global-cpp-name = "::", identifier-shaped-name,
                  { "::", identifier-shaped-name };

contextual-case-expression = ".", IDENTIFIER;

grouped-expression = "(", expression, ")";

tuple-expression = "(", ")"
                 | "(", expression-list-element, ",",
                   [ expression-list-element,
                     { ",", expression-list-element }, [ "," ] ], ")";

construction-expression = construction-type,
                          "{", [ construction-initializer-list ], "}"
                        | "{", [ field-initializer-list ], "}";

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

array-expression = "[", [ array-element-list ], "]"
                 | "[", expression, ";", expression, "]";

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

## 31 · if

```text
if-form = [ "const" ], "if", expression, branch-block,
          { "else", "if", expression, branch-block },
          [ "else", branch-block ];
```

## 32 · try 与 catch

```text
try-form = "try", branch-block, "catch", "{", [ catch-arm-list ], "}";
catch-arm-list = catch-arm, { ",", catch-arm }, [ "," ];
catch-arm = catch-pattern, [ "if", expression ], "=>", match-arm-body;
catch-pattern = catch-atom, { "|", catch-atom };
catch-atom = "_" | named-type, "(", pattern, ")";
```

## 33 · match 与模式

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
               | tuple-pattern
               | "(", pattern, ")"
               | range-pattern;

tuple-pattern = "(", ")"
              | "(", pattern, ",", [ pattern, { ",", pattern }, [ "," ] ], ")";

range-pattern = shift-expression, "..", [ shift-expression ]
              | "..", shift-expression
              | [ shift-expression ], "..=", shift-expression;

wildcard-pattern = "_";

literal-pattern = NUMBER_LITERAL | STRING_LITERAL | C_STRING_LITERAL | CHAR_LITERAL
                | "true" | "false";

negative-number-pattern = "-", NUMBER_LITERAL;

binding-pattern = [ "&" ], IDENTIFIER;

case-pattern = case-name, [ "(", [ pattern-list ], ")" ];

case-name = ".", IDENTIFIER
          | qualified-name, "::", identifier-shaped-name;

pattern-list = pattern, { ",", pattern }, [ "," ];

constraint-pattern = "is", constraint-operand;

constraint-operand = qualified-name | array-type;
```

## 34 · 分支体

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
