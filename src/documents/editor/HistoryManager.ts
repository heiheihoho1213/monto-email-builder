import { TEditorConfiguration } from './core';

/**
 * 历史记录管理器
 * 负责管理文档的撤销/重做历史记录
 */
export class HistoryManager {
  private past: TEditorConfiguration[] = [];
  private present: TEditorConfiguration;
  private future: TEditorConfiguration[] = [];
  private readonly maxHistorySize: number = 5; // 最多支持回退5步

  constructor(initialDocument: TEditorConfiguration) {
    this.present = this.deepClone(initialDocument);
  }

  /**
   * 记录新的历史状态
   */
  record(newDocument: TEditorConfiguration): TEditorConfiguration {
    // 如果新文档与当前文档相同，不记录
    if (this.isEqual(this.present, newDocument)) {
      return this.present;
    }

    // 将当前状态加入历史栈
    this.past.push(this.present);

    // 限制历史记录数量
    if (this.past.length > this.maxHistorySize) {
      this.past.shift(); // 删除最旧的记录
    }

    // 更新当前状态
    this.present = this.deepClone(newDocument);

    // 清空重做栈（新操作会清空重做历史）
    this.future = [];

    return this.present;
  }

  /**
   * 撤销操作
   */
  undo(): TEditorConfiguration | null {
    if (this.past.length === 0) {
      return null; // 无法撤销
    }

    // 将当前状态加入重做栈
    this.future.unshift(this.present);

    // 从历史栈中取出上一个状态
    const previous = this.past.pop()!;
    this.present = this.deepClone(previous);

    return this.present;
  }

  /**
   * 重做操作
   */
  redo(): TEditorConfiguration | null {
    if (this.future.length === 0) {
      return null; // 无法重做
    }

    // 将当前状态加入历史栈
    this.past.push(this.present);

    // 限制历史记录数量
    if (this.past.length > this.maxHistorySize) {
      this.past.shift();
    }

    // 从重做栈中取出下一个状态
    const next = this.future.shift()!;
    this.present = this.deepClone(next);

    return this.present;
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.past.length > 0;
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * 获取当前状态
   */
  getPresent(): TEditorConfiguration {
    return this.present;
  }

  /**
   * 重置历史记录（用于外部重置文档时）
   */
  reset(newDocument: TEditorConfiguration): void {
    this.past = [];
    this.present = this.deepClone(newDocument);
    this.future = [];
  }

  /**
   * 深拷贝文档（使用 JSON 方法，简单高效）
   */
  private deepClone(document: TEditorConfiguration): TEditorConfiguration {
    return JSON.parse(JSON.stringify(document)) as TEditorConfiguration;
  }

  /**
   * 比较两个文档是否相等（简单比较，用于避免重复记录）
   */
  private isEqual(doc1: TEditorConfiguration, doc2: TEditorConfiguration): boolean {
    return JSON.stringify(doc1) === JSON.stringify(doc2);
  }
}
