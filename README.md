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
type module = {
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
