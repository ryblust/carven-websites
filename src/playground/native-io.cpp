#include <carven/std/io/native.hpp>

#include <cerrno>
#include <cstdio>
#include <string_view>

namespace carven::standard::io {

auto write_stdout(std::string_view bytes) noexcept -> std::int32_t {
    if (std::fwrite(bytes.data(), 1, bytes.size(), stdout) != bytes.size()
        || std::fflush(stdout) != 0) {
        return errno == 0 ? EIO : errno;
    }
    return 0;
}

auto write_output(runtime::Vector<std::uint8_t> bytes) noexcept
    -> runtime::execution::AsyncOperation<std::int32_t> {
    if (runtime::execution::cancel_requested()) {
        co_return runtime::execution::Completion<std::int32_t>::cancelled();
    }
    // Browser stdout is an immediate in-memory sink, with no pipe to poll.
    co_return runtime::execution::Completion<std::int32_t>::success_from([&]() noexcept {
        return write_stdout(
            std::string_view(reinterpret_cast<const char*>(bytes.begin()), bytes.size())
        );
    });
}

} // namespace carven::standard::io
