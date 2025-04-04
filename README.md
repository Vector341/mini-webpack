参考文章：https://juejin.cn/post/7031546400034947108
所属专栏：https://juejin.cn/column/7031912597133721631

## 初始化阶段

完成参数传入

## 编译阶段

创建 compiler
注册插件
寻找入口

## 模块编译阶段

入口编译、模块编译
**数据类型**
入口文件和模块文件没有区别，它们最终都被编译为模块

```typescript
type Module = {
  id: Path; // 模块id
  dependencies: Set<Path>; // 依赖模块
  name: string[]; // 所属 chunk
  _source: string; // 模块编译后的源代码
};
```

### 难点

#### 模块相对路径、绝对路径的转换

webpack.config.js 中传入绝对路径
内部使用相对路径（相对 context 即 path.cwd()）

不同 entry 引入同一个 modules，这个模块该如何处理

> 如果不存在则添加进入依赖中进行编译，如果该模块已经存在过了就证明这个模块已经被编译过了。所以此时我们不需要将它再次进行编译，我们仅仅需要更新这个模块所属的 chunk，为它的 name 属性添加当前所属的 chunk 名称。

## 编译完成阶段

compiler.js/buildUpChunk
根据已有模块的信息生成 chunk

**数据类型**

```typescript
type Chunk = {
  name: stirng; // 当前入口文件的名称
  entryModule: Module; // 入口文件编译后的对象
  modules: Module[]; // 该入口文件依赖的所有模块对象组成的数组，其中每一个元素的格式和entryModule是一致的。
};
```

## 模块生成阶段

将 this.chunks 内容组织为 asset 后输出到磁盘，每个 chunk 生成一份文件

**数据结构**

```typescript
type Asset = {
  [filename: string]: string; // filename -> code
};
```
