import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Briefcase, Folder, FolderOpen, FileCode, Edit2, Trash2, Copy, PlayCircle, Plus, MoreVertical, Lock, Unlock } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export interface TreeNode {
  id: string;
  name: string;
  type: 'entity' | 'category' | 'job';
  active?: boolean;
  checkedOutBy?: string;
  children?: TreeNode[];
}

// 保留純前端 tree 操作 helper（不走 API，用於 optimistic update）
const updateTreeName = (nodes: TreeNode[], id: string, newName: string): TreeNode[] => {
  return nodes.map(node => {
     if (node.id === id) return { ...node, name: newName };
     if (node.children) return { ...node, children: updateTreeName(node.children, id, newName) };
     return node;
  });
};
const updateTreeStatus = (nodes: TreeNode[], id: string): TreeNode[] => {
  return nodes.map(node => {
     if (node.id === id) return { ...node, active: !node.active };
     if (node.children) return { ...node, children: updateTreeStatus(node.children, id) };
     return node;
  });
};
const deleteFromTree = (nodes: TreeNode[], id: string): TreeNode[] => {
  return nodes.filter(node => node.id !== id).map(node => ({
     ...node,
     children: node.children ? deleteFromTree(node.children, id) : undefined
  }));
};
const insertIntoTree = (nodes: TreeNode[], parentId: string | null, newNode: TreeNode): TreeNode[] => {
  if (!parentId) return [...nodes, newNode];
  return nodes.map(node => {
     if (node.id === parentId) {
        return { ...node, children: [...(node.children || []), newNode] };
     }
     if (node.children) return { ...node, children: insertIntoTree(node.children, parentId, newNode) };
     return node;
  });
};

export default function JobTree({ onSelectJob, selectedJobId }: any) {
  const { t } = useTranslation();
  const [data, setData] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Context Menu State
  const [menuCoords, setMenuCoords] = useState<{x: number, y: number} | null>(null);
  const [menuNode, setMenuNode] = useState<TreeNode | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── 載入後端樹狀資料 ──────────────────────────────────────
  const loadTree = useCallback(async () => {
    try {
      const res = await fetch('/api/jcs/hierarchy');
      const resp = await res.json();
      const tree: TreeNode[] = resp.tree || [];
      setData(tree);
      // 預設展開第一層
      const initial: Record<string, boolean> = {};
      tree.forEach(n => { initial[n.id] = true; (n.children || []).forEach(c => { initial[c.id] = true; }); });
      setExpanded(prev => ({ ...initial, ...prev }));
    } catch (e) { console.error('JobTree load error:', e); }
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  // Close Context Menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setMenuCoords(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const toggleExpand = (id: string, force?: boolean) => {
    setExpanded(prev => ({ ...prev, [id]: force !== undefined ? force : !prev[id] }));
  };

  const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuNode(node);
    setMenuCoords({ x: e.clientX, y: e.clientY });
  };

  const handleCreateNode = async (parentId: string | null, type: 'entity' | 'category' | 'job') => {
    const defaultName = type === 'entity' ? 'New_Entity' : type === 'category' ? 'New_Category' : 'New_Job';
    try {
      const res = await fetch('/api/jcs/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, type, name: defaultName })
      });
      if (res.ok) {
        const newNode: TreeNode = await res.json();
        setData(prev => insertIntoTree(prev, parentId, newNode));
        if (parentId) toggleExpand(parentId, true);
        setEditingId(newNode.id);
        setEditValue(newNode.name);
      }
    } catch (e) {
      // fallback: optimistic local create
      const newNode: TreeNode = {
        id: Date.now().toString(), name: defaultName, type,
        children: type !== 'job' ? [] : undefined,
        active: type === 'category' ? true : undefined,
      };
      setData(prev => insertIntoTree(prev, parentId, newNode));
      if (parentId) toggleExpand(parentId, true);
      setEditingId(newNode.id);
      setEditValue(newNode.name);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('delete_confirm'))) {
      try {
        await fetch(`/api/jcs/hierarchy/${id}`, { method: 'DELETE' });
      } catch (e) { /* optimistic */ }
      setData(prev => deleteFromTree(prev, id));
    }
  };

  const submitEdit = async () => {
    if (editingId && editValue.trim() !== '') {
      setData(prev => updateTreeName(prev, editingId, editValue.trim()));
      try {
        await fetch(`/api/jcs/hierarchy/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editValue.trim() })
        });
      } catch (e) { /* best-effort */ }
    }
    setEditingId(null);
  };

  const handleToggleStatus = async (node: TreeNode) => {
    setData(prev => updateTreeStatus(prev, node.id));
    try {
      await fetch(`/api/jcs/hierarchy/${node.id}/toggle`, { method: 'POST' });
    } catch (e) { /* best-effort */ }
  };

  const handleCheckout = async (id: string) => {
    try {
      const res = await fetch(`/api/jcs/hierarchy/${id}/checkout`, { method: 'POST' });
      if (res.ok) await loadTree();
    } catch (e) { console.error(e); }
  };

  const handleCheckin = async (id: string) => {
    try {
      const res = await fetch(`/api/jcs/hierarchy/${id}/checkin`, { method: 'POST' });
      if (res.ok) await loadTree();
    } catch (e) { console.error(e); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submitEdit();
    if (e.key === 'Escape') setEditingId(null);
  };

  const renderContextMenu = () => {
    if (!menuCoords || !menuNode) return null;

    return (
      <div 
        className="fixed z-50 bg-[var(--surface-raised)] border border-[var(--border-subtle)] shadow-lg rounded-md py-1 text-sm min-w-[160px]"
        style={{ top: menuCoords.y, left: menuCoords.x }}
        onClick={(e) => e.stopPropagation()} // Prevent clicking menu items from closing menu immediately via window event if not intended
      >
        {menuNode.type === 'entity' && (
          <>
            <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
               onClick={() => { setMenuCoords(null); handleCreateNode(menuNode.id, 'category'); }}>
               {t('add_category')}
            </button>
            <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
               onClick={() => { setMenuCoords(null); setEditingId(menuNode.id); setEditValue(menuNode.name); }}>
               {t('rename')}
            </button>
            <div className="h-px bg-[var(--border-subtle)] my-1"></div>
            <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-red-500"
               onClick={() => { setMenuCoords(null); handleDelete(menuNode.id); }}>
               {t('delete_entity')}
            </button>
          </>
        )}
        {menuNode.type === 'category' && (
          <>
            <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
               onClick={() => { setMenuCoords(null); handleCreateNode(menuNode.id, 'job'); }}>
               {t('add_job')}
            </button>
            <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
               onClick={() => { setMenuCoords(null); setEditingId(menuNode.id); setEditValue(menuNode.name); }}>
               {t('rename')}
            </button>
            <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
               onClick={() => { setMenuCoords(null); handleToggleStatus(menuNode); }}>
               {t('toggle_schedule')}
            </button>
            <div className="h-px bg-[var(--border-subtle)] my-1"></div>
            <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-red-500"
               onClick={() => { setMenuCoords(null); handleDelete(menuNode.id); }}>
               {t('delete_category')}
            </button>
          </>
        )}
        {menuNode.type === 'job' && (
          <>
            <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
               onClick={() => { setMenuCoords(null); onSelectJob(menuNode.id, menuNode); }}>
               {t('open_in_designer')}
            </button>
            <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
               onClick={() => { 
                 setMenuCoords(null); 
                 console.log("Navigating to console for filtering job", menuNode.id); 
               }}>
               {t('open_in_monitor')}
            </button>
            <div className="h-px bg-[var(--border-subtle)] my-1"></div>
            {menuNode.checkedOutBy ? (
              <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-amber-400 flex items-center gap-2"
                 onClick={() => { setMenuCoords(null); handleCheckin(menuNode.id); }}>
                 <Unlock className="w-3.5 h-3.5" />{t('checkin')}
              </button>
            ) : (
              <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-blue-400 flex items-center gap-2"
                 onClick={() => { setMenuCoords(null); handleCheckout(menuNode.id); }}>
                 <Lock className="w-3.5 h-3.5" />{t('checkout')}
              </button>
            )}
            <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
               onClick={() => { setMenuCoords(null); setEditingId(menuNode.id); setEditValue(menuNode.name); }}>
               {t('rename')}
            </button>
            <div className="h-px bg-[var(--border-subtle)] my-1"></div>
            <button className="w-full text-left px-4 py-1.5 hover:bg-[var(--surface-hover)] text-red-500"
               onClick={() => { setMenuCoords(null); handleDelete(menuNode.id); }}>
               {t('delete_job')}
            </button>
          </>
        )}
      </div>
    );
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isExpanded = expanded[node.id];
    const isSelected = selectedJobId === node.id;
    const isEditing = editingId === node.id;
    
    return (
      <div key={node.id}>
        <div 
           className={clsx(
             "group flex items-center gap-2 py-1.5 pr-2 rounded cursor-pointer transition-colors text-sm relative",
             depth === 0 ? "px-2" : `pl-[${(depth + 1) * 12}px]`,
             isSelected && !isEditing ? "bg-[var(--surface-active)] text-[var(--accent-blue-text)]" : "hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
           )}
           style={{ paddingLeft: `${depth * 12 + 8}px` }}
           onClick={() => {
             if (isEditing) return;
             if (node.type !== 'job') toggleExpand(node.id);
             else onSelectJob(node.id, node);
           }}
           onDoubleClick={() => {
             if (node.type !== 'job' && !isEditing) {
                setEditingId(node.id);
                setEditValue(node.name);
             }
           }}
           onContextMenu={(e) => handleContextMenu(e, node)}
        >
           {/* Icon */}
           {node.type === 'entity' && <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />}
           {node.type === 'category' && (isExpanded ? <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" /> : <Folder className="w-4 h-4 text-amber-500 shrink-0" />)}
           {node.type === 'job' && <FileCode className={clsx('w-4 h-4 shrink-0', node.checkedOutBy ? 'text-amber-400' : 'text-emerald-400')} />}
           
           {/* Name or Editor */}
           {isEditing ? (
             <input
               ref={inputRef}
               value={editValue}
               onChange={(e) => setEditValue(e.target.value)}
               onBlur={submitEdit}
               onKeyDown={handleKeyDown}
               className="flex-1 bg-[var(--surface-raised)] border-none outline-none text-[var(--text-primary)] ring-1 ring-[var(--accent-blue)] rounded px-1 h-5 text-sm"
               onClick={(e) => e.stopPropagation()}
               onDoubleClick={(e) => e.stopPropagation()}
             />
           ) : (
             <span 
               className={clsx("flex-1 truncate", isSelected && "font-semibold")}
               onDoubleClick={(e) => {
                 if (node.type === 'job') {
                    // Specific double click handling for jobs if necessary
                    setEditingId(node.id);
                    setEditValue(node.name);
                 }
               }}
             >
               {node.name}
             </span>
           )}

           {/* Category Toggle Badge */}
           {node.type === 'category' && !isEditing && (
             <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setData(prev => updateTreeStatus(prev, node.id));
                }}
                className={clsx(
                 "text-[10px] px-1.5 rounded transition-all",
                 node.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400",
                 "opacity-0 group-hover:opacity-100 hover:scale-105"
               )}
               title={`Toggle schedule ${node.active ? 'off' : 'on'}`}
             >
               {node.active ? 'ON' : 'OFF'}
             </button>
           )}
        </div>
        
        {/* Children */}
        {isExpanded && node.children && (
          <div className="mt-0.5 space-y-0.5 relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-[var(--border-subtle)]" style={{ marginLeft: `${depth * 12 + 15}px`, paddingLeft: '9px' }}>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-2 border-t border-[var(--border-subtle)] pt-4 pb-4 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-between shrink-0">
        <span>{t('job_hierarchy')}</span>
        <button 
          className="text-[var(--accent-blue-text)] hover:opacity-80 transition-opacity" 
          title={t('add_entity')}
          onClick={() => handleCreateNode(null, 'entity')}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-2 mt-1 space-y-0.5 flex-1 overflow-y-auto">
        {data.map(node => renderNode(node, 0))}
      </div>

      {renderContextMenu()}
    </div>
  );
}
