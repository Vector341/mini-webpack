const { SyncHook } = require("tapable");

class Compiler {
  constructor(options) {
    this.options = options;
    this.hooks = {
      run: new SyncHook(),
      emit: new SyncHook(),
      done: new SyncHook(),
    };
    this.entries = new Set();
    this.modules = new Set();
    this.chunks = new Set();
    this.assets = new Set();
    this.files = new Set();
  }
  run(callback) {
    this.hooks.run.call();
    const entry = this.getEntry();
    // 解析 entry

    callback(error, stats);
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
      }
    });
    return entry;
  }

  buildEntryModule(entry) {
    entry.keys().forEach((entryName) => {
      const entryPath = entry[entryName];
      const entryModule = this.buildMoudle(entryName, entryPath);
      this.entries.add(entryModule);
    });
  }
  buildMoudle(moduleName, modulePath) {
    const originSource = fs.readFileSync(modulePath, "utf-8");
    this.moduleCode = originSource;
    // 省略 loader 处理的步骤
    const module = this.handleWebpackCompiler(moduleName, modulePath);
    return module;
  }
  handleWebpackCompiler(moduleName, modulePath) {
    const moduleId = modulePath;
    const module = {
      id: moduleId,
      dependencies: new Set(), // 该模块所依赖模块绝对路径地址
      name: [moduleName], // 该模块所属的入口文件
      _source: "", // 生成的模块源码
    };
    // 解析 source code，生成 AST
    // 遍历 AST，分析依赖

    return module;
  }
}

module.exports = Compiler;
