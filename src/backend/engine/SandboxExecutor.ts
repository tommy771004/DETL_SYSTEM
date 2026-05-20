/**
 * @file SandboxExecutor.ts
 * @description Node 原生 vm 沙盒環境封裝。
 * 限制執行時間 (Timeout) 與防範部分危險的 Node.js 核心模組讀取。
 * (註：企業環境若需極致安全與 Memory Limit 控制，建議改用 isolated-vm，唯在此因為跨平台 native addon 編譯問題，故標準化提供 vm 實作)
 */
import vm from 'vm';

export class SandboxExecutor {
  public static executeOptions = {
    timeout: 3000, // 限制執行時間 3000ms (3秒)，防止無窮迴圈鎖死 Event Loop
  };

  /**
   * 執行不信任的使用者字串
   * @param code 使用者的 JavaScript 程式碼
   * @param data 上游資料 (Stream/Batch)
   * @param variables 變數環境 (Context)
   */
  public static run(code: string, data: any[], variables: Record<string, any>): any[] {
    // 1. 建立受限的物件作為全域變數，防止存取 fs, child_process 等
    const sandboxContext = {
      // 供使用者將 function 導出
      module: { exports: {} as any },
      // 遮蔽危險或非必要的原生 console，導向系統 Logger
      console: { 
        log: (...args: any[]) => console.log('\x1b[36m[Sandbox Log]\x1b[0m', ...args),
        error: (...args: any[]) => console.error('\x1b[31m[Sandbox Error]\x1b[0m', ...args),
      },
      // 刻意遮蔽以下變數，防止沙盒逃逸或破壞
      process: undefined,
      require: undefined,
      global: undefined,
      setTimeout: undefined,
      setInterval: undefined,
      setImmediate: undefined,
    };

    // 建立 Context，VM 執行時將無法抓到 Node 主程序的 Global Context
    const sandbox = vm.createContext(sandboxContext);

    try {
      // 2. 封裝程式碼，啟用 strict mode
      const wrappedCode = `
        'use strict';
        ${code}
      `;
      const script = new vm.Script(wrappedCode);

      // 3. 執行，並啟用 timeout 保護
      script.runInContext(sandbox, { 
        timeout: SandboxExecutor.executeOptions.timeout,
        displayErrors: true 
      });

      const userFunction = sandboxContext.module.exports;

      if (typeof userFunction !== 'function') {
        throw new Error('腳本必須導出一個函式。例如：module.exports = function(data, vars) { return data; }');
      }

      // 4. 動態執行 User 自定義轉換函式
      const result = userFunction(data, variables);
      return Array.isArray(result) ? result : [result];
      
    } catch (error: any) {
      // 處理 Timeout 或 Syntax Error
      if (error.message && error.message.includes('Script execution timed out')) {
        throw new Error(`[SandboxExecutor] 腳本執行超時 (超過 ${SandboxExecutor.executeOptions.timeout}ms)，請檢查是否有無限迴圈。`);
      }
      throw new Error(`[SandboxExecutor] 腳本執行失敗: ${String(error)}`);
    }
  }
}
