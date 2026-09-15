// Authored homepage snippets. Highlighted during content generation.
export const homeExamples = {
  failures: `fn pickup_quote(qty: i32, stock: i32, zone: i32)
    -> i32 throw QuantityError + OutOfStock
{
    return try {
        (line_total(qty, stock) + delivery_fee(zone))?
    } catch {
        DeliveryError(_) => line_total(qty, stock)?,
    };
}`,
  constants: `const fn labels(count: i32) -> String {
    var text = String::new();
    for index in 0..count {
        text.append_format(f"[{index:02}]");
    }
    return text;
}

const names = labels(3);

const test "generated labels" {
    check(names == "[00][01][02]");
}`,
  native: `import <cmath> using std::hypot;

export(cpp) fn distance(x: f64, y: f64) -> f64 {
    return hypot(x, y);
}`,
  failuresCpp: `#include <cstdint>
#include <expected>
#include <variant>

using ItemError = std::variant<QuantityError, OutOfStock>;
using Quote = std::expected<std::int32_t, ItemError>;

Quote pickup_quote(int qty, int stock, int zone) {
    auto item = line_total(qty, stock);
    if (!item) {
        return std::unexpected(item.error());
    }

    auto delivery = delivery_fee(zone);
    if (!delivery) {
        return line_total(qty, stock);
    }
    return *item + *delivery;
}`,
  constantsCpp: `#include <array>
#include <string_view>

template <std::size_t Count>
constexpr auto labels() {
    static_assert(Count <= 100);
    std::array<char, Count * 4> text{};
    for (std::size_t i = 0; i < Count; ++i) {
        text[i * 4] = '[';
        text[i * 4 + 1] = char('0' + i / 10);
        text[i * 4 + 2] = char('0' + i % 10);
        text[i * 4 + 3] = ']';
    }
    return text;
}

constexpr auto storage = labels<3>();
constexpr std::string_view names{storage.data(), storage.size()};
static_assert(names == "[00][01][02]");`,
  nativeCpp: `// distance.hpp
#pragma once

namespace app {
    double distance(double x, double y);
}

// distance.cpp
#include "distance.hpp"
#include <cmath>

namespace app {
    double distance(double x, double y) {
        return std::hypot(x, y);
    }
}`,
} as const;
