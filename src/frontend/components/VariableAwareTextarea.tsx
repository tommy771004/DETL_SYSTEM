import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface Props extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  variables: {key: string, value: string}[];
  value: string;
  onChange: (val: string) => void;
}

export function VariableAwareTextarea({ variables, onChange, value, ...props }: Props) {
  const { t } = useTranslation();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const valStr = value || '';

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    
    // Check if we are typing a variable
    const pos = e.target.selectionStart || 0;
    setCursorPos(pos);
    
    const textBeforeCursor = newVal.substring(0, pos);
    if (textBeforeCursor.match(/\$\{[A-Za-z0-9_]*$/)) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Delay hiding suggestions to allow click events to register
    setTimeout(() => setShowSuggestions(false), 200);
    if (props.onBlur) props.onBlur(e);
  };

  const insertVariable = (varKey: string) => {
    const textBeforeCursor = valStr.substring(0, cursorPos);
    const textAfterCursor = valStr.substring(cursorPos);
    
    // Replace the incomplete ${VAR with ${VAR}
    const match = textBeforeCursor.match(/\$\{[A-Za-z0-9_]*$/);
    if (match) {
      const beforeMatch = textBeforeCursor.substring(0, match.index);
      const newVal = beforeMatch + `\${${varKey}}` + textAfterCursor;
      onChange(newVal);
      
      // Update cursor and suggestion state after render
      setTimeout(() => {
        if (inputRef.current) {
          const newPos = match.index + varKey.length + 3; // +3 for ${}
          inputRef.current.setSelectionRange(newPos, newPos);
          inputRef.current.focus();
        }
      }, 0);
    }
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full">
      <textarea 
        ref={inputRef}
        value={valStr}
        onChange={handleInput}
        onBlur={handleBlur}
        onKeyUp={e => setCursorPos(e.currentTarget.selectionStart || 0)}
        onClick={e => setCursorPos(e.currentTarget.selectionStart || 0)}
        {...props} 
      />
      {showSuggestions && variables.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-48 overflow-y-auto w-full">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
            {t('avail_vars')}
          </div>
          {variables.filter(v => !!v.key).map(v => (
            <div 
              key={v.key} 
              className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between items-center group transition"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur
                insertVariable(v.key);
              }}
            >
              <span className="font-mono text-xs font-semibold text-blue-600 group-hover:text-blue-800">
                <span className="text-blue-300">{"${"}</span>{v.key}<span className="text-blue-300">{"}"}</span>
              </span>
              <span className="text-xs text-slate-400 truncate max-w-[120px] group-hover:text-slate-600" title={v.value}>
                {v.value || <span className="italic">{t('empty')}</span>}
              </span>
            </div>
          ))}
          {variables.filter(v => !!v.key).length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400 italic">{t('no_vars_defined')}</div>
          )}
        </div>
      )}
    </div>
  );
}
