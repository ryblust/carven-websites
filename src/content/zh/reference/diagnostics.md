---
title: 诊断代码目录
description: 按代码查找当前检查边界、默认严重性与定位方向。
section: reference
lesson: 21
source: src/diagnostics/code.cpp
---

## 如何使用诊断

先读源位置，再按代码确认检查边界。Error 使相应编译操作失败；Warning 不使其他方面有效的程序失败。消息正文、注释、颜色和排序属于呈现，不应作为稳定机器接口。

未使用检查以可达引用作为使用；_ 从来不是未使用候选。列表导入中的任一个所选绑定被唯一引用就算使用。

## 常见修复方向

| 类别              | 检查内容                                      |
| ----------------- | --------------------------------------------- |
| ACCESS            | 参数标记、可写性、Take 来源、可用性和活跃借用 |
| CONST             | 常量上下文、执行子集、溢出、依赖环和预算      |
| EFFECT            | ? 的非空要求、声明上界、剩余捕获集合          |
| TYPE / MATCH      | 规范类型、上下文、case 载荷、模式覆盖         |
| CPP               | 原生提供者标识符与 API 名字冲突               |
| PTR               | 解引用前局部非空证明                          |
| ENTRY / INTERPRET | 入口个数与参数、解释执行子集                  |
| TEST              | 条件、消息类型、参数数目与活动测试            |

## 当前代码目录

下面保留编译器注册的代码、默认级别和英文默认描述，便于对照终端。具体诊断位置可提供更细的说明和 notes。

| 代码                                      | 默认级别 | 默认描述                                                                     |
| ----------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| `CV-INVALID`                              | Error    | Invalid diagnostic code.                                                     |
| `CV-ACCESS-CALL-MISMATCH`                 | Error    | Call access mismatch.                                                        |
| `CV-ACCESS-BORROW-CONFLICT`               | Error    | Binding is borrowed by a callable view.                                      |
| `CV-ACCESS-CAPTURE-CONFLICT`              | Error    | Take conflicts with a mutating capture.                                      |
| `CV-ACCESS-EXPRESSION`                    | Error    | Invalid access expression.                                                   |
| `CV-ACCESS-OPERATION-CONFLICT`            | Error    | One operation both takes and otherwise accesses a binding.                   |
| `CV-ACCESS-TAKE-OPERAND`                  | Error    | Invalid Take operand.                                                        |
| `CV-ACCESS-UNAVAILABLE`                   | Error    | Unavailable binding use.                                                     |
| `CV-ACCESS-WRITE-ARGUMENT`                | Error    | Invalid Write call argument.                                                 |
| `CV-ACCESS-IMMUTABLE`                     | Error    | Update of an immutable value.                                                |
| `CV-ACCESS-NOT-ASSIGNABLE`                | Error    | Non-assignable Update target.                                                |
| `CV-ACCESS-RANGE-BINDING`                 | Error    | Invalid Write range binding.                                                 |
| `CV-ACCESS-RANGE-ITERABLE`                | Error    | Invalid Write range iterable.                                                |
| `CV-CATALOG`                              | Error    | Semantic catalog failure.                                                    |
| `CV-COMPILATION-INPUT`                    | Error    | Invalid closed-compilation input.                                            |
| `CV-CPP-IDENTIFIER`                       | Error    | Invalid C++ boundary identifier.                                             |
| `CV-CPP-API-PATH-COLLISION`               | Error    | C++ API function conflicts with a namespace path.                            |
| `CV-CONST-ARRAY-EXTENT`                   | Error    | Invalid constant array extent.                                               |
| `CV-CONST-CYCLE`                          | Error    | Constant elaboration cycle.                                                  |
| `CV-CONST-DIVIDE-BY-ZERO`                 | Error    | Constant division by zero.                                                   |
| `CV-CONST-ENUM-CASE`                      | Error    | Invalid enum case constant.                                                  |
| `CV-CONST-ENUM-OVERFLOW`                  | Error    | Enum case constant overflow.                                                 |
| `CV-CONST-ENUM-RANGE`                     | Error    | Enum case constant is out of range.                                          |
| `CV-CONST-EVALUATION`                     | Error    | Constant function evaluation failed.                                         |
| `CV-CONST-EXPORTED-TYPE`                  | Error    | Exported constant is missing its declared type.                              |
| `CV-CONST-ADMISSION`                      | Error    | Invalid constant execution contract.                                         |
| `CV-CONST-INITIALIZER`                    | Error    | Invalid constant initializer.                                                |
| `CV-CONST-INDEX-BOUNDS`                   | Error    | Constant array index is out of bounds.                                       |
| `CV-CONST-LIMIT`                          | Error    | Constant evaluation resource limit exceeded.                                 |
| `CV-CONST-TEST`                           | Error    | Compile-time test failed.                                                    |
| `CV-CONST-LITERAL-RANGE`                  | Error    | Constant literal is out of range.                                            |
| `CV-CONST-NEGATIVE-ARRAY-EXTENT`          | Error    | Negative array extent.                                                       |
| `CV-CONST-OVERFLOW`                       | Error    | Constant arithmetic overflow.                                                |
| `CV-CONST-SHIFT-RANGE`                    | Error    | Constant shift is out of range.                                              |
| `CV-ENTRY-DUPLICATE`                      | Error    | Duplicate entry point.                                                       |
| `CV-ENTRY-PARAMETERS`                     | Error    | Invalid entry-point parameters.                                              |
| `CV-INTERPRET-ADMISSION`                  | Error    | Unsupported interpreter operation.                                           |
| `CV-INTERPRET-EXECUTION`                  | Error    | Interpreter execution failed.                                                |
| `CV-INTERPRET-LIMIT`                      | Error    | Interpreter execution budget exceeded.                                       |
| `CV-FLOW-BREAK-OUTSIDE-LOOP`              | Error    | Break outside a loop.                                                        |
| `CV-FLOW-CONTINUE-OUTSIDE-LOOP`           | Error    | Continue outside a loop.                                                     |
| `CV-FLOW-MISSING-RETURN`                  | Error    | Missing return path.                                                         |
| `CV-FLOW-TRANSFER-VALUE-BRANCH`           | Error    | Control transfer crosses a value-expression boundary.                        |
| `CV-FLOW-UNREACHABLE`                     | Warning  | Unreachable statement.                                                       |
| `CV-FLOW-UNREACHABLE-MATCH-ARM`           | Warning  | Unreachable match arm.                                                       |
| `CV-FLOW-VALUE-BRANCH-RESULT`             | Error    | Value branch is missing a result expression.                                 |
| `CV-IMPORT-RESOLUTION`                    | Error    | Import resolution failure.                                                   |
| `CV-LEXICAL`                              | Error    | Lexical analysis failure.                                                    |
| `CV-LAMBDA-CAPTURE-MISSING`               | Error    | Missing explicit lambda capture.                                             |
| `CV-LAMBDA-CAPTURE-DUPLICATE`             | Error    | Duplicate lambda capture.                                                    |
| `CV-LAMBDA-CAPTURE-INVALID`               | Error    | Invalid lambda capture.                                                      |
| `CV-LAMBDA-CAPTURE-UNUSED`                | Warning  | Unused lambda capture.                                                       |
| `CV-LAMBDA-SIGNATURE-INFERENCE`           | Error    | Lambda signature cannot be inferred.                                         |
| `CV-LINT-UNUSED-IMPORT`                   | Warning  | Unused import.                                                               |
| `CV-LINT-UNUSED-LOCAL`                    | Warning  | Unused local binding.                                                        |
| `CV-LINT-UNUSED-PARAMETER`                | Warning  | Unused function parameter.                                                   |
| `CV-MATCH-DUPLICATE-ALTERNATIVE`          | Error    | Duplicate match alternative.                                                 |
| `CV-MATCH-NON-EXHAUSTIVE`                 | Error    | Non-exhaustive value match.                                                  |
| `CV-MATCH-BINDING-MISMATCH`               | Error    | Or-pattern bindings do not agree.                                            |
| `CV-NAME-AMBIGUOUS`                       | Error    | Ambiguous name.                                                              |
| `CV-NAME-DUPLICATE-ENUM-CASE`             | Error    | Duplicate enum case.                                                         |
| `CV-NAME-DUPLICATE-FIELD`                 | Error    | Duplicate field name.                                                        |
| `CV-NAME-DUPLICATE-LOCAL`                 | Error    | Duplicate local name.                                                        |
| `CV-NAME-DUPLICATE-PARAMETER`             | Error    | Duplicate parameter name.                                                    |
| `CV-NAME-UNRESOLVED`                      | Error    | Unresolved value name.                                                       |
| `CV-NAME-UNRESOLVED-PATTERN`              | Error    | Unresolved pattern name.                                                     |
| `CV-PARSE-NESTING-TOO-DEEP`               | Error    | Parser nesting limit exceeded.                                               |
| `CV-PTR-NONNULL`                          | Error    | Dereference requires a proven non-null address.                              |
| `CV-SYNTAX`                               | Error    | Syntax error.                                                                |
| `CV-EFFECT-THROW-TYPE`                    | Error    | Invalid thrown failure type.                                                 |
| `CV-EFFECT-THROW-DUPLICATE`               | Error    | Duplicate failure in throw clause.                                           |
| `CV-EFFECT-THROW-PUBLISHED`               | Error    | Entry or published callable with failures requires an explicit throw clause. |
| `CV-EFFECT-SIGNATURE-BOUND`               | Error    | Callable body exceeds its declared failure contract.                         |
| `CV-EFFECT-UNMARKED`                      | Error    | Failure-producing expression requires explicit propagation.                  |
| `CV-EFFECT-PROPAGATE-REDUNDANT`           | Error    | Propagation applied to an infallible value.                                  |
| `CV-EFFECT-ROOT-UNHANDLED`                | Error    | Effect root leaves failures unhandled.                                       |
| `CV-EFFECT-CATCH-NON-EXHAUSTIVE`          | Error    | Catch does not cover every protected failure.                                |
| `CV-EFFECT-CATCH-ARM-UNREACHABLE`         | Warning  | Unreachable catch arm.                                                       |
| `CV-EFFECT-CATCH-ALTERNATIVE-UNREACHABLE` | Warning  | Unreachable catch alternative.                                               |
| `CV-EFFECT-RETHROW-CONTEXT`               | Error    | Rethrow outside a catch handler.                                             |
| `CV-TEST-ARGUMENT-COUNT`                  | Error    | Invalid inline-test operation arguments.                                     |
| `CV-TEST-CONDITION-TYPE`                  | Error    | Inline-test condition must have type bool.                                   |
| `CV-TEST-DUPLICATE-NAME`                  | Error    | Duplicate test name.                                                         |
| `CV-TEST-MAIN-NAME`                       | Error    | Reserved test-main name.                                                     |
| `CV-TEST-MESSAGE-TYPE`                    | Error    | Inline-test message must have type str.                                      |
| `CV-TYPE-DEFAULT-INITIALIZATION`          | Error    | Type has no default value.                                                   |
| `CV-TYPE-ARRAY-ELEMENT`                   | Error    | Incompatible array element type.                                             |
| `CV-TYPE-ASSIGNMENT-INTEGER`              | Error    | Integer assignment required.                                                 |
| `CV-TYPE-ASSIGNMENT-NUMERIC`              | Error    | Numeric assignment required.                                                 |
| `CV-TYPE-BINARY`                          | Error    | Incompatible binary operand types.                                           |
| `CV-TYPE-BINARY-INTEGER`                  | Error    | Integer binary operands required.                                            |
| `CV-TYPE-BINARY-NUMERIC`                  | Error    | Numeric binary operands required.                                            |
| `CV-TYPE-BINARY-ORDERED`                  | Error    | Ordered operands required.                                                   |
| `CV-TYPE-CALL-ARGUMENT`                   | Error    | Invalid call argument type.                                                  |
| `CV-TYPE-CALL-ARITY`                      | Error    | Invalid call arity.                                                          |
| `CV-TYPE-CALLABLE-VIEW-ESCAPE`            | Error    | Non-owning callable view escapes its invocation lifetime.                    |
| `CV-TYPE-CAST`                            | Error    | Invalid explicit conversion.                                                 |
| `CV-TYPE-CONDITION-BOOL`                  | Error    | Boolean condition required.                                                  |
| `CV-TYPE-CONSTRUCT-ARITY`                 | Error    | Invalid construction arity.                                                  |
| `CV-TYPE-CONSTRUCT-DUPLICATE-FIELD`       | Error    | Duplicate field initializer.                                                 |
| `CV-TYPE-CONSTRUCT-NOT-STRUCT`            | Error    | Structure construction required.                                             |
| `CV-TYPE-CONSTRUCT-UNKNOWN-FIELD`         | Error    | Unknown construction field.                                                  |
| `CV-TYPE-EMPTY-ARRAY`                     | Error    | Empty array type cannot be inferred.                                         |
| `CV-TYPE-ENUM-UNDERLYING`                 | Error    | Invalid enum underlying type.                                                |
| `CV-TYPE-ENUM-EMPTY`                      | Error    | Enum must declare at least one case.                                         |
| `CV-TYPE-ENUM-PROFILE`                    | Error    | Invalid enum profile.                                                        |
| `CV-TYPE-ENUM-DUPLICATE-CODE`             | Error    | Duplicate enum numeric code.                                                 |
| `CV-TYPE-ENUM-CASE-ARITY`                 | Error    | Invalid enum case arity.                                                     |
| `CV-TYPE-ENUM-CONTEXT`                    | Error    | Contextual enum case requires an expected enum type.                         |
| `CV-TYPE-EQUALITY-UNSUPPORTED`            | Error    | Type does not support equality.                                              |
| `CV-TYPE-RECURSIVE-STORAGE`               | Error    | Type has recursive by-value storage.                                         |
| `CV-TYPE-VISIBILITY-LEAK`                 | Error    | A declaration surface exposes a narrower-visibility identity.                |
| `CV-TYPE-IF-BRANCH`                       | Error    | Incompatible if branch types.                                                |
| `CV-TYPE-IF-MISSING-ELSE`                 | Error    | Value if is missing else.                                                    |
| `CV-TYPE-INDEX-INTEGER`                   | Error    | Integer index required.                                                      |
| `CV-TYPE-LOGICAL-BOOL`                    | Error    | Boolean logical operands required.                                           |
| `CV-TYPE-MATCH-ARM`                       | Error    | Incompatible match arm types.                                                |
| `CV-TYPE-MATCH-CONSTRAINT`                | Error    | Invalid match type constraint.                                               |
| `CV-TYPE-MATCH-PATTERN`                   | Error    | Invalid match pattern type.                                                  |
| `CV-TYPE-MEMBER-UNRESOLVED`               | Error    | Unresolved member.                                                           |
| `CV-TYPE-MISMATCH`                        | Error    | Type mismatch.                                                               |
| `CV-TYPE-MISSING-RETURN-VALUE`            | Error    | Missing return value.                                                        |
| `CV-TYPE-NOT-CALLABLE`                    | Error    | Expression is not callable.                                                  |
| `CV-TYPE-NOT-INDEXABLE`                   | Error    | Expression is not indexable.                                                 |
| `CV-TYPE-PARAMETER-ANNOTATION`            | Error    | Missing parameter type annotation.                                           |
| `CV-TYPE-PREFIX-BOOL`                     | Error    | Boolean prefix operand required.                                             |
| `CV-TYPE-PREFIX-INTEGER`                  | Error    | Integer prefix operand required.                                             |
| `CV-TYPE-PREFIX-NUMERIC`                  | Error    | Numeric prefix operand required.                                             |
| `CV-TYPE-RANGE-BINDING`                   | Error    | Invalid range binding type.                                                  |
| `CV-TYPE-RANGE-BOUNDS`                    | Error    | Invalid range bound types.                                                   |
| `CV-TYPE-RANGE-INTEGER`                   | Error    | Integer range required.                                                      |
| `CV-TYPE-RANGE-ITERABLE`                  | Error    | Invalid range iterable.                                                      |
| `CV-TYPE-RETURN-MISMATCH`                 | Error    | Return type mismatch.                                                        |
| `CV-TYPE-RESULT-INFERENCE-CYCLE`          | Error    | Function result inference cycle.                                             |
| `CV-TYPE-RETURN-VALUE`                    | Error    | Unexpected return value.                                                     |
| `CV-TYPE-METHOD-CALL`                     | Error    | Invalid built-in method call.                                                |
| `CV-TYPE-METHOD-CALL-ARITY`               | Error    | Invalid built-in method call arity.                                          |
| `CV-TYPE-TEXT-PROPERTY`                   | Error    | Invalid text property.                                                       |
| `CV-TYPE-UNRESOLVED`                      | Error    | Unresolved type.                                                             |
| `CV-TYPE-UPDATE-INTEGER`                  | Error    | Integer update target required.                                              |
| `CV-TYPE-VALUE-REQUIRED`                  | Error    | A value-bearing position requires a value type.                              |
