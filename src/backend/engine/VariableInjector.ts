/**
 * @file VariableInjector.ts
 * @description 變數替換引擎輔助函數，在 execute 執行前，將 Config 中的 `${VARIABLE}` 替換為全域變數或 Payload。
 */

/**
 * 遞迴替換物件字串內的變數 (e.g. ${EXECUTION_DATE})
 * @param config 要替換的設定檔或任意物件
 * @param variables 變數字典
 */
export function injectVariables<T>(config: T, variables: Record<string, any>): T {
  if (typeof config === 'string') {
    return config.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      return variables[varName] !== undefined ? variables[varName] : '';
    }) as unknown as T;
  }

  if (Array.isArray(config)) {
    return config.map(item => injectVariables(item, variables)) as unknown as T;
  }

  if (config !== null && typeof config === 'object') {
    const result: Record<string, any> = {};
    for (const key in config) {
      if (Object.prototype.hasOwnProperty.call(config, key)) {
        result[key] = injectVariables((config as Record<string, any>)[key], variables);
      }
    }
    return result as unknown as T;
  }

  return config;
}
