[settings]
arch=wasm
os=Emscripten
build_type=Release
compiler=clang
compiler.cppstd=gnu23
compiler.libcxx=libc++
compiler.version=16

[conf]
tools.cmake.cmaketoolchain:generator=Ninja
