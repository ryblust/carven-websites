---
title: "Formal grammar and precedence"
description: "Complete EBNF productions, associativity, delimiters, and control-header disambiguation."
section: reference
lesson: 20
source: docs/grammar.md
---

## Notation and use

This appendix contains every EBNF block in the current grammar document. Quotes mark terminals, uppercase names denote tokens, and lowercase hyphenated names denote nonterminals. Commas mean concatenation; vertical bars mean alternatives; square brackets mean optional content; braces mean repetition; parentheses group terms. A where clause adds a syntactic predicate. Productions describe token order; semantic rules check types, access, and borrowing.

## Precedence

From lowest to highest: access expressions, logical or, logical and, bitwise or, xor, bitwise and, comparisons, shifts, addition/subtraction, multiplication/division/remainder, as, prefix, and postfix. Repeated binary forms and as associate left. All comparisons share one non-associative level: unparenthesized comparison chains are invalid. There is no comma expression.

An access marker can start only at the beginning of an expression production and covers the complete expression to its right. Infix & and && retain their bitwise-and/logical-and meanings. Argument markers use this same expression mechanism. Captures and range bindings have separate forms admitting only &.

## Parsing boundaries

An unparenthesized if/match/try at the start of a statement is a control statement. In a branch, an ordinary expression followed by a semicolon is a statement; directly followed by the closing brace, it is a branch result. Nested control forms inherit the syntactic role of their branch position. A branch-block is not a general standalone block expression.

Explicit comma lists accept one trailing comma only where their productions permit it; it creates no empty item. Shorthand return/throw/rethrow/break/continue arms have no semicolon. Use a branch block for multiple statements.

T { ... } parses as construction; T(...) always parses as a call. At the outer depth of a control header, the required opening brace starts the body. Group a construction expression in parentheses to use it at that position. This applies to if, match, loop containers, and integer-range bounds. Pattern is, binding identifiers, cases, and vertical bars are disambiguated without name lookup.

Module imports form a contiguous prefix. Top-level const declares module constants; top-level executable statements form an implicit entry. There is no namespace block, generic declaration, default parameter, or variadic parameter syntax. Integer ranges are recognized only after in in a for loop and require both endpoints. There are no inclusive ranges, omitted endpoints, step syntax, or general range values.

## 01 · Notation

```text
production = term, term;
choice     = first | second;
optional   = [ element ];
repeated   = { element };
grouped    = ( first | second ), suffix;
```

## 02 · Source text

```text
line-terminator = U+000A | U+000D, [ U+000A ];
horizontal-space = U+0020 | U+0009;
whitespace = horizontal-space | line-terminator;

line-comment = "//", { source-character - line-terminator },
               [ line-terminator ];
```

## 03 · Identifiers

```text
ASCII_LETTER = "A" | ... | "Z" | "a" | ... | "z";
DIGIT        = "0" | ... | "9";

IDENTIFIER = ( ASCII_LETTER | "_" ),
             { ASCII_LETTER | DIGIT | "_" };
```

## 04 · Numeric literals

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

## 05 · Text literals

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

## 06 · Interpolated text

```text
interpolated-string = 'f"', { interpolation-text | interpolation-hole }, '"';
interpolation-hole = "{", expression, [ ":", format-specification ], "}";
format-specification = { format-text | interpolation-hole };
```

## 07 · C++ header names

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

## 08 · C++ source fragments

```text
cpp-fence = "-", "-", "-", { "-" };

CPP_SOURCE_FRAGMENT = "#[cpp]",
                      horizontal-space, { horizontal-space },
                      cpp-fence, { horizontal-space }, line-terminator,
                      cpp-source-tail;
```

## 09 · Modules and top-level items

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

## 10 · Imports

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

## 11 · Enums

```text
enum-declaration = "enum", IDENTIFIER,
                   [ ":", type ],
                   "{", enum-case-list, "}";

enum-case-list = enum-case, { ",", enum-case }, [ "," ];

enum-case = IDENTIFIER, [ enum-payload | "=", expression ];

enum-payload = "(", type, { ",", type }, [ "," ], ")";
```

## 12 · Structs

```text
struct-declaration = "struct", IDENTIFIER,
                     "{", [ struct-field-list ], "}";

struct-field-list = struct-field,
                    { ",", struct-field },
                    [ "," ];

struct-field = IDENTIFIER, ":", type;
```

## 13 · Functions

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

## 14 · Tests

```text
test-declaration = [ "const" ], "test", STRING_LITERAL, test-block;

test-block = "{", { statement }, "}";
```

## 15 · Types

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

## 16 · Ordinary blocks

```text
ordinary-block = "{", { statement }, "}";
```

## 17 · Statement categories

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

## 18 · Assignment and updates

```text
assignment-form = expression, assignment-operator, expression;

assignment-operator = "=" | "+=" | "-=" | "*=" | "/=" | "%="
                    | "&=" | "|=" | "^=" | "<<=" | ">>=";

update-form = update-operator, prefix-expression;

update-operator = "++" | "--";
```

## 19 · Binding declarations

```text
variable-declaration = variable-declaration-head, ";";

variable-declaration-head = binding-kind, binding-target,
                            [ ":", type ],
                            "=", expression;

binding-kind = "let" | "var" | "const";

binding-target = IDENTIFIER;
```

## 20 · Control transfers

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

range-for-source = expression, [ "..", expression ];

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

## 23 · Branch blocks

```text
branch-block = "{", { statement }, [ branch-result ], "}";

branch-result = expression;
```

## 24 · Expression precedence

```text
expression = access-expression | logical-or-expression;

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

## 25 · Prefix expressions

```text
prefix-expression = prefix-operator, prefix-expression
                  | postfix-expression;

prefix-operator = "!" | "-" | "~" | "*";
```

## 26 · Postfix expressions

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

## 27 · Primary expressions

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

## 28 · Conditional forms

```text
if-form = "if", expression, branch-block,
          { "else", "if", expression, branch-block },
          [ "else", branch-block ];
```

## 29 · try and catch

```text
try-form = "try", branch-block, "catch", "{", [ catch-arm-list ], "}";
catch-arm-list = catch-arm, { ",", catch-arm }, [ "," ];
catch-arm = catch-pattern, [ "if", expression ], "=>", match-arm-body;
catch-pattern = catch-atom, { "|", catch-atom };
catch-atom = "_" | named-type, "(", pattern, ")";
```

## 30 · match and patterns

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
               | case-pattern;

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

## 31 · Arm bodies

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
