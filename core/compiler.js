const { SyncHook } = require("tapable");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const t = require("@babel/types");
const fs = require("fs");
const path = require("path");
const { toUnixPath, getSourceCode, tryExtensions } = require("./utils");

class Compiler {
  constructor(options) {
    this.options = options;
    this.rootPath = toUnixPath(options.context);
    this.hooks = {
      run: new SyncHook(),
      emit: new SyncHook(),
      done: new SyncHook(),
    };
    this.entries = new Set();
    this.modules = new Set();
    this.chunks = new Set();
    this.assets = {};
    this.files = new Set();
  }
  run(callback) {
    let error = null,
      stats = null;
    try {
      this.hooks.run.call();
      const entry = this.getEntry();
      this.buildEntryModule(entry);
      // 输出文件
      this.exportFile(callback);
    } catch (e) {
      console.error(e);

      error = e;
    }
  }
  /**
   *
   * @returns entry {Object} entryName -> entryPath
   */
  getEntry() {
    let entry = Object.create(null);
    const { entry: optionsEntry } = this.options;
    if (typeof optionsEntry === "string") {
      entry["main"] = optionsEntry;
    } else {
      entry = optionsEntry;
    }
    // 将entry变成绝对路径
    Object.keys(entry).forEach((key) => {
      const value = entry[key];
      if (!path.isAbsolute(value)) {
        // 转化为绝对路径的同时统一路径分隔符为 /
        entry[key] = toUnixPath(path.join(this.rootPath, value));
      } else {
        entry[key] = toUnixPath(value);
      }
    });
    return entry;
  }

  buildEntryModule(entry) {
    Object.keys(entry).forEach((entryName) => {
      const entryPath = entry[entryName];
      const entryModule = this.buildModule(entryName, entryPath);
      this.entries.add(entryModule);
      // 根据当前入口文件和模块的相互依赖关系，组装成为一个个包含当前入口所有依赖模块的chunk
      this.buildUpChunk(entryName, entryModule);
    });
  }
  buildModule(moduleName, modulePath) {
    const originSource = fs.readFileSync(modulePath, "utf-8");
    this.moduleCode = originSource;
    // 省略 loader 处理的步骤
    const module = this.handleWebpackCompiler(moduleName, modulePath);
    return module;
  }
  /**
   *
   * @param {*} moduleName 模块名
   * @param {*} modulePath 模块绝对路径
   * @returns
   */
  handleWebpackCompiler(moduleName, modulePath) {
    const moduleId = "./" + path.posix.relative(this.rootPath, modulePath);
    const module = {
      id: moduleId,
      dependencies: new Set(), // 该模块所依赖模块绝对路径地址
      name: [moduleName], // 该模块所属的入口文件
      _source: "", // 生成的模块源码
    };
    // 解析 source code，生成 AST
    // 遍历 AST，分析依赖
    const ast = parser.parse(this.moduleCode, {
      sourceType: "module",
    });

    traverse(ast, {
      CallExpression: (nodePath) => {
        const callee = nodePath.get("callee");
        const node = nodePath.node;
        if (callee.isIdentifier({ name: "require" })) {
          const args = nodePath.get("arguments");
          if (args.length > 0) {
            const requirePath = args[0].node.value;
            const moduleDirPath = path.posix.dirname(modulePath);
            const requireModulePath = path.posix.join(
              moduleDirPath,
              requirePath
            );
            const absPath = tryExtensions(
              requireModulePath,
              this.options.resolve.extensions,
              requirePath,
              moduleDirPath
            );
            // 生成moduleId - 针对于根路径的模块ID 添加进入新的依赖模块路径
            const moduleId = "./" + path.posix.relative(this.rootPath, absPath);
            // 通过babel修改源代码中的require变成__webpack_require__语句
            // 使用工具生成 node
            node.callee = t.identifier("__webpack_require__");
            // 修改源代码中require语句引入的模块 全部修改变为相对于跟路径来处理
            node.arguments = [t.stringLiteral(moduleId)];
            // 为当前模块添加require语句造成的依赖(内容为相对于根路径的模块ID)
            module.dependencies.add(moduleId);
          }
        }
      },
    });

    const { code } = generator(ast);
    module._source = code;
    // 递归依赖深度遍历 存在依赖模块则加入
    module.dependencies.forEach((dependency) => {
      const absPath = path.posix.join(this.rootPath, dependency);
      const depModule = this.buildModule(moduleName, absPath);
      // 将编译后的任何依赖模块对象加入到modules对象中去
      this.modules.add(depModule);
    });

    return module;
  }
  buildUpChunk(entryName, entryObj) {
    const chunk = {
      name: entryName,
      entryModule: entryObj,
      modules: Array.from(this.modules).filter((m) => {
        return m.name.includes(entryName);
      }),
    };
    this.chunks.add(chunk);
  }
  exportFile(callback) {
    const { output } = this.options;
    this.chunks.forEach((chunk) => {
      const parsedFilenmame = output.filename.replace(/\[name\]/g, chunk.name);
      this.assets[parsedFilenmame] = getSourceCode(chunk);
    });
    this.hooks.emit.call();
    const outputPath = path.resolve(this.rootPath, output.path);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath);
    }
    this.files = Object.keys(this.assets);
    this.files.forEach((filename) => {
      const filePath = path.join(outputPath, filename);
      fs.writeFileSync(filePath, this.assets[filename]);
    });
    this.hooks.done.call();
    callback(null, {
      toJson: () => {
        return {
          entries: this.entries,
          modules: this.modules,
          files: this.files,
          chunks: this.chunks,
          assets: this.assets,
        };
      },
    });
  }
}

module.exports = Compiler;
