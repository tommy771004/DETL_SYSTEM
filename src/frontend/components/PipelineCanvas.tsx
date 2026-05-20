import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  Panel,
  MarkerType,
  MiniMap
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import CustomNode from './CustomNode';
import { VariableAwareInput } from './VariableAwareInput';
import { VariableAwareTextarea } from './VariableAwareTextarea';

const nodeTypes = {
  custom: CustomNode,
  default: CustomNode
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: { strokeWidth: 2, stroke: '#94a3b8' },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#94a3b8',
  },
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

let id = 0;
const getId = () => `dndnode_${id++}`;

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 200, align: 'DL' });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 300, height: 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top' as any,
      sourcePosition: isHorizontal ? 'right' : 'bottom' as any,
      position: {
        x: nodeWithPosition.x - 300 / 2,
        y: nodeWithPosition.y - 100 / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export default function PipelineCanvas({ onSaveConfig }: { onSaveConfig: (config: any) => void }) {
  const { t } = useTranslation();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [pipelineVariables, setPipelineVariables] = useState<{key: string, value: string}[]>([]);
  const [pipelineTrigger, setPipelineTrigger] = useState<{type: 'webhook'|'cron', expr?: string}>({ type: 'webhook' });

  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    []
  );

  const compilePipeline = () => {
    // Basic compiler from UI graph to JSON config
    const variablesObj = pipelineVariables.reduce((acc, curr) => {
      if (curr.key) acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    const pipelineConfig = {
      pipelineId: "dnd_pipe_" + Date.now(),
      trigger: pipelineTrigger,
      variables: variablesObj,
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.data.type || 'default', // Ideally read from custom node state
        config: node.data.config || {}
      })),
      edges: edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        condition: edge.label || 'success'
      }))
    };
    onSaveConfig(pipelineConfig);
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      if (!reactFlowWrapper.current) return;
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: getId(),
        type: 'custom',
        position,
        data: { label: `${type} node`, type: type, config: {} },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    []
  );

  const selectedNode = nodes.find(n => n.selected);

  const handleConfigChange = (key: string, value: string) => {
    if (!selectedNode) return;
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              config: {
                ...(node.data.config as Record<string, any>),
                [key]: value
              }
            }
          };
        }
        return node;
      })
    );
  };

  const renderConfigFields = () => {
    if (!selectedNode) return null;
    const type = selectedNode.data.type as string;
    const config = (selectedNode.data.config || {}) as Record<string, any>;

    const inputClasses = "bg-black/20 border border-white/10 rounded-xl p-3 text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:outline-none w-full transition-all placeholder-slate-600";
    const labelClasses = "text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1 block";

    switch (type) {
      case 'source_api':
        return (
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className={labelClasses}>{t('endpoint_url')}</label>
              <VariableAwareInput 
                className={inputClasses} 
                value={config.endpoint || ''} 
                onChange={(value) => handleConfigChange('endpoint', value)} 
                variables={pipelineVariables}
                placeholder="https://api.example.com/data"
              />
            </div>
            <div>
              <label className={`${labelClasses} text-blue-400`}>{t('search_ai_query')}</label>
              <VariableAwareTextarea 
                className={`${inputClasses} min-h-[80px] font-mono text-xs`} 
                value={config.searchQuery || ''} 
                onChange={(value) => handleConfigChange('searchQuery', value)} 
                variables={pipelineVariables}
                placeholder="Fetch latest stock market prices as JSON..."
              />
            </div>
          </div>
        );
      case 'source_csv':
        return (
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className={labelClasses}>{t('file_path_pattern')}</label>
              <VariableAwareInput 
                className={inputClasses} 
                value={config.filePath || ''} 
                onChange={(value) => handleConfigChange('filePath', value)} 
                variables={pipelineVariables}
                placeholder="./ftp_inbox/*.csv"
              />
            </div>
          </div>
        );
      case 'transform_ai':
        return (
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className={labelClasses}>{t('gemini_prompt')}</label>
              <VariableAwareTextarea 
                className={`${inputClasses} min-h-[120px] font-mono text-xs leading-relaxed`} 
                value={config.prompt || ''} 
                onChange={(value) => handleConfigChange('prompt', value)} 
                variables={pipelineVariables}
                placeholder="Aggregate and summarize the data..."
              />
            </div>
          </div>
        );
      case 'transform_address_normalization':
      case 'transform_address_geocoding':
        return (
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className={labelClasses}>{t('target_field')}</label>
              <VariableAwareInput 
                className={inputClasses} 
                value={config.targetField || ''} 
                onChange={(value) => handleConfigChange('targetField', value)} 
                variables={pipelineVariables}
                placeholder="address"
              />
            </div>
            <div>
              <label className={labelClasses}>{t('output_field')}</label>
              <VariableAwareInput 
                className={inputClasses} 
                value={config.outputField || ''} 
                onChange={(value) => handleConfigChange('outputField', value)} 
                variables={pipelineVariables}
                placeholder={type === 'transform_address_normalization' ? "normalized_address" : "coordinates"}
              />
            </div>
          </div>
        );
      case 'custom_script':
      case 'transform_custom_script':
        return (
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className={labelClasses}>{t('code_js')}</label>
              <VariableAwareTextarea 
                className={`bg-black/40 border border-white/5 text-slate-300 rounded-xl p-4 text-sm min-h-[250px] font-mono text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none w-full transition-all shadow-inner`} 
                value={config.code || ''} 
                onChange={(value) => handleConfigChange('code', value)} 
                variables={pipelineVariables}
                placeholder="module.exports = function(data, vars) { ... }"
              />
            </div>
          </div>
        );
      case 'transform_zero_landing_masking':
        return (
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className={labelClasses}>{t('masking_rules_json')}</label>
              <VariableAwareTextarea 
                className={`${inputClasses} min-h-[150px] font-mono text-xs`} 
                value={typeof config.rules === 'string' ? config.rules : JSON.stringify(config.rules || {}, null, 2)} 
                onChange={(value) => {
                  handleConfigChange('rules', value);
                }} 
                variables={pipelineVariables}
                placeholder={"{\n  \"email\": \"mask\",\n  \"id_number\": \"scramble\"\n}"}
              />
            </div>
          </div>
        );
      case 'transform_clean':
        return (
          <div className="flex flex-col gap-4 mt-2">
            <div className="glass-card border-white/5 p-4 rounded-xl">
              <label className={`text-sm font-bold flex items-center gap-3 cursor-pointer text-slate-300 hover:text-white transition-colors`}>
                <input 
                  type="checkbox" 
                  className="accent-blue-500 w-4 h-4 cursor-pointer"
                  checked={config.removeNulls || false} 
                  onChange={(e) => handleConfigChange('removeNulls', e.target.checked ? 'true' : '')} 
                />
                {t('remove_nulls')}
              </label>
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mt-3">{t('auto_trim_hint')}</p>
            </div>
          </div>
        );
      case 'transform_validate':
        return (
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className={labelClasses}>{t('required_fields')} (comma separated)</label>
              <input 
                className={inputClasses} 
                value={config.requiredFields || ''} 
                onChange={(e) => handleConfigChange('requiredFields', e.target.value)} 
                placeholder="id, email, status"
              />
            </div>
          </div>
        );
      case 'source_kafka':
        return (
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className={labelClasses}>{t('brokers')}</label>
              <input 
                className={inputClasses} 
                value={config.brokers || ''} 
                onChange={(e) => handleConfigChange('brokers', e.target.value)} 
                placeholder="localhost:9092"
              />
            </div>
            <div>
              <label className={labelClasses}>{t('topic')}</label>
              <input 
                className={inputClasses} 
                value={config.topic || ''} 
                onChange={(e) => handleConfigChange('topic', e.target.value)} 
                placeholder="events_topic"
              />
            </div>
          </div>
        );
      case 'source_nosql':
        return (
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className={labelClasses}>{t('db_type')}</label>
              <select 
                className={`${inputClasses} appearance-none cursor-pointer border-white/10`}
                value={config.dbType || 'mongodb'}
                onChange={(e) => handleConfigChange('dbType', e.target.value)}
              >
                <option value="mongodb" className="bg-slate-900 text-white">MongoDB</option>
                <option value="redis" className="bg-slate-900 text-white">Redis</option>
                <option value="cassandra" className="bg-slate-900 text-white">Cassandra</option>
                <option value="dynamodb" className="bg-slate-900 text-white">DynamoDB</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>{t('connection_uri')} / Endpoint</label>
              <input 
                className={inputClasses} 
                value={config.uri || ''} 
                onChange={(e) => handleConfigChange('uri', e.target.value)} 
                placeholder="mongodb://localhost:27017"
              />
            </div>
            <div>
              <label className={labelClasses}>{t('collection_key_pattern')}</label>
              <input 
                className={inputClasses} 
                value={config.collection || ''} 
                onChange={(e) => handleConfigChange('collection', e.target.value)} 
                placeholder="users"
              />
            </div>
          </div>
        );
      case 'source_db':
      case 'dest_db_real':
      case 'dest_db':
        return (
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className={labelClasses}>{t('db_driver')}</label>
              <select 
                className={`${inputClasses} appearance-none cursor-pointer`}
                value={config.dbType || 'postgres'}
                onChange={(e) => handleConfigChange('dbType', e.target.value)}
              >
                <option value="postgres" className="bg-slate-900 text-white">PostgreSQL</option>
                <option value="mysql" className="bg-slate-900 text-white">MySQL</option>
                <option value="mssql" className="bg-slate-900 text-white">SQL Server (MSSQL)</option>
                <option value="oracle" className="bg-slate-900 text-white">Oracle DB</option>
                <option value="sybase" className="bg-slate-900 text-white">Sybase</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelClasses}>{t('host')}</label>
                <input 
                  className={inputClasses} 
                  value={config.host || ''} 
                  onChange={(e) => handleConfigChange('host', e.target.value)} 
                  placeholder="localhost"
                />
              </div>
              <div>
                <label className={labelClasses}>{t('port')}</label>
                <input 
                  type="number"
                  className={inputClasses} 
                  value={config.port || ''} 
                  onChange={(e) => handleConfigChange('port', e.target.value)} 
                  placeholder="5432"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>{t('user')}</label>
                <input 
                  className={inputClasses} 
                  value={config.user || ''} 
                  onChange={(e) => handleConfigChange('user', e.target.value)} 
                />
              </div>
              <div>
                <label className={labelClasses}>{t('password')}</label>
                <input 
                  type="password"
                  className={inputClasses} 
                  value={config.password || ''} 
                  onChange={(e) => handleConfigChange('password', e.target.value)} 
                />
              </div>
            </div>
            <div>
              <label className={labelClasses}>{t('database_name')}</label>
              <input 
                className={inputClasses} 
                value={config.database || ''} 
                onChange={(e) => handleConfigChange('database', e.target.value)} 
              />
            </div>
            {type === 'source_db' ? (
              <div>
                <label className={labelClasses}>{t('sql_query')}</label>
                <textarea 
                  className={`${inputClasses} min-h-[80px] font-mono text-xs`} 
                  value={config.query || ''} 
                  onChange={(e) => handleConfigChange('query', e.target.value)} 
                  placeholder="SELECT * FROM table"
                />
              </div>
            ) : (
              <div>
                <label className={labelClasses}>{t('destination_table')}</label>
                <input 
                  className={inputClasses} 
                  value={config.table || ''} 
                  onChange={(e) => handleConfigChange('table', e.target.value)} 
                  placeholder="fct_orders"
                />
              </div>
            )}
            {type !== 'source_db' && (
               <div>
                 <label className={labelClasses}>{t('chunk_size')}</label>
                 <input 
                   type="number"
                   className={inputClasses} 
                   value={config.chunkSize || ''} 
                   onChange={(e) => handleConfigChange('chunkSize', e.target.value)} 
                   placeholder="1000"
                 />
               </div>
            )}
          </div>
        );
      default:
        return <div className="text-xs font-black uppercase tracking-widest text-slate-500 mt-4 p-4 border border-white/5 rounded-xl bg-black/20 text-center">{t('no_props_avail')} <span className="text-blue-400">`{type}`</span></div>;
    }
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-transparent flex-1 relative rounded-[1.5rem]" ref={reactFlowWrapper}>
      {/* Node Toolbox */}
      <div className="w-[200px] border-r border-white/5 bg-black/20 flex flex-col pt-4 overflow-y-auto shrink-0 z-10 backdrop-blur-md">
        <div className="px-5 pb-2 text-[10px] uppercase font-black tracking-[0.2em] text-slate-500">{t('reader')}</div>
        
        <div className="px-3 pb-4 space-y-1">
          <div 
             className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 cursor-grab border border-transparent transition-all text-sm font-bold text-slate-300"
             onDragStart={(event) => onDragStart(event, 'source_api')} draggable
          >
            <div className="p-1.5 bg-blue-500/20 rounded-md border border-blue-500/30">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
            </div>
            <span className="truncate">{t('source_api')}</span>
          </div>
          <div 
             className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 cursor-grab border border-transparent transition-all text-sm font-bold text-slate-300"
             onDragStart={(event) => onDragStart(event, 'source_db')} draggable
          >
            <div className="p-1.5 bg-emerald-500/20 rounded-md border border-emerald-500/30">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
            </div>
            <span className="truncate">{t('source_db')}</span>
          </div>
          <div 
             className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 cursor-grab border border-transparent transition-all text-sm font-bold text-slate-300"
             onDragStart={(event) => onDragStart(event, 'source_csv')} draggable
          >
            <div className="p-1.5 bg-sky-500/20 rounded-md border border-sky-500/30">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400 shrink-0"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
            </div>
            <span className="truncate">{t('source_csv')}</span>
          </div>
        </div>

        <div className="px-5 pb-2 text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 mt-2">{t('transformer')}</div>
        
        <div className="px-3 pb-4 space-y-1">
          <div 
             className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 cursor-grab border border-transparent transition-all text-sm font-bold text-slate-300"
             onDragStart={(event) => onDragStart(event, 'transform_ai')} draggable
          >
            <div className="p-1.5 bg-purple-500/20 rounded-md border border-purple-500/30">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 shrink-0"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>
            </div>
            <span className="truncate">{t('ai_transform')}</span>
          </div>
          <div 
             className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 cursor-grab border border-transparent transition-all text-sm font-bold text-slate-300"
             onDragStart={(event) => onDragStart(event, 'transform_custom_script')} draggable
          >
            <div className="p-1.5 bg-pink-500/20 rounded-md border border-pink-500/30">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400 shrink-0"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>
            </div>
            <span className="truncate">{t('custom_script')}</span>
          </div>
          <div 
             className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 cursor-grab border border-transparent transition-all text-sm font-bold text-slate-300"
             onDragStart={(event) => onDragStart(event, 'transform_clean')} draggable
          >
            <div className="p-1.5 bg-fuchsia-500/20 rounded-md border border-fuchsia-500/30">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fuchsia-400 shrink-0"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>
            </div>
            <span className="truncate">{t('data_cleaner')}</span>
          </div>
        </div>

        <div className="px-5 pb-2 text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 mt-2">{t('writer')}</div>
        
        <div className="px-3 pb-4 space-y-1">
          <div 
             className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 cursor-grab border border-transparent transition-all text-sm font-bold text-slate-300"
             onDragStart={(event) => onDragStart(event, 'dest_db_real')} draggable
          >
            <div className="p-1.5 bg-amber-500/20 rounded-md border border-amber-500/30">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
            </div>
            <span className="truncate">{t('destination_db')}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
        >
          <Background color="#ffffff" opacity={0.05} gap={24} size={2} />
          <Controls className="bg-black/40 border-white/10 fill-white text-white shadow-xl backdrop-blur-md rounded-xl overflow-hidden" />
          <MiniMap 
            nodeStrokeWidth={3} 
            zoomable 
            pannable 
            className="bg-black/40 border border-white/10 shadow-xl backdrop-blur-md rounded-xl"
            maskColor="rgba(0,0,0,0.5)"
          />
          <Panel position="top-right" className="flex gap-3 m-4">
            <button
               onClick={() => onLayout('LR')}
               className="px-5 py-2 glass-card border flex space-x-2 border-white/10 text-white rounded-xl shadow-lg hover:bg-white/10 transition-all items-center gap-2 text-sm font-black active:scale-95"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
               {t('auto_layout')}
            </button>
            <button 
               onClick={compilePipeline}
               className="px-5 py-2 bg-blue-600 border border-transparent text-white rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-500 transition-all flex items-center gap-2 text-sm font-black active:scale-95 flex-row space-x-2"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
               {t('save_pipeline')}
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {selectedNode ? (
        <div className="w-[340px] h-full bg-black/40 border-l border-white/5 p-6 overflow-y-auto flex flex-col gap-8 z-10 shrink-0 backdrop-blur-xl ring-1 ring-white/5">
          <div className="relative">
            <h3 className="font-extrabold text-white flex items-center justify-between tracking-tight text-lg mb-2">
              <span>{t('properties')}</span>
              <span className="px-3 py-1 rounded-full text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 tracking-widest uppercase font-black">{t('selected')}</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedNode.data.label} ({selectedNode.data.type as string})</p>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">{t('node_label')}</label>
              <input 
                className="bg-black/20 border border-white/10 rounded-xl p-3 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:outline-none transition-all" 
                value={(selectedNode.data.label as string) || ''} 
                onChange={(e) => {
                  setNodes((nds) => 
                    nds.map((node) => {
                      if (node.id === selectedNode.id) {
                        return { ...node, data: { ...node.data, label: e.target.value } };
                      }
                      return node;
                    })
                  );
                }}
              />
            </div>
            
            {/* The config fields need to be updated to match the theme below, they are currently defined in renderConfigFields */}
            {renderConfigFields()}
          </div>
        </div>
      ) : (
        <div className="w-[340px] h-full bg-black/40 border-l border-white/5 p-6 overflow-y-auto flex flex-col gap-8 z-10 shrink-0 backdrop-blur-xl ring-1 ring-white/5">
          <div>
            <h3 className="font-extrabold text-white flex items-center gap-3 tracking-tight text-lg mb-2">
              <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              {t('pipeline_settings')}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('pipeline_settings_desc')}</p>
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-3">{t('execution_trigger')}</h4>
              <div className="flex items-center gap-6">
                <label className="text-sm font-bold flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white transition-colors">
                  <input 
                    type="radio" 
                    name="trigger" 
                    value="webhook" 
                    checked={pipelineTrigger.type === 'webhook'}
                    onChange={() => setPipelineTrigger({ type: 'webhook' })}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  /> Webhook
                </label>
                <label className="text-sm font-bold flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white transition-colors">
                  <input 
                    type="radio" 
                    name="trigger" 
                    value="cron" 
                    checked={pipelineTrigger.type === 'cron'}
                    onChange={() => setPipelineTrigger({ type: 'cron', expr: '0 0 * * *' })}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  /> Cron
                </label>
              </div>
              {pipelineTrigger.type === 'cron' && (
                <div className="flex flex-col gap-2 mt-2 animate-in fade-in zoom-in duration-200">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('cron_expression')}</label>
                  <input 
                    className="bg-black/20 border border-white/10 rounded-xl p-3 text-sm font-mono font-bold text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:outline-none transition-all"
                    value={pipelineTrigger.expr || ''}
                    onChange={(e) => setPipelineTrigger({ type: 'cron', expr: e.target.value })}
                    placeholder="*/5 * * * *"
                  />
                  <p className="text-[10px] font-medium text-slate-400 mt-1">{t('cron_syntax_hint')}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-3">{t('variables')}</h4>
            {pipelineVariables.map((v, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  className={`bg-black/20 flex-1 w-0 border rounded-xl p-2.5 text-sm font-mono font-bold text-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all ${!/^[A-Z_][A-Z0-9_]*$/.test(v.key) && v.key.length > 0 ? 'border-rose-500/50 bg-rose-500/10 focus:border-rose-500' : 'border-white/10 focus:border-blue-500/50'}`}
                  placeholder={t('key_placeholder')}
                  value={v.key}
                  onChange={e => {
                    const newVars = [...pipelineVariables];
                    newVars[idx].key = e.target.value.toUpperCase().replace(/\s/g, '_').replace(/[^A-Z0-9_]/g, '');
                    setPipelineVariables(newVars);
                  }}
                  title={!/^[A-Z_][A-Z0-9_]*$/.test(v.key) && v.key.length > 0 ? t('invalid_key') : ""}
                />
                <span className="text-slate-500 font-bold">=</span>
                <input
                  className="bg-black/20 flex-1 w-0 border border-white/10 rounded-xl p-2.5 text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:outline-none transition-all"
                  placeholder={t('value_placeholder')}
                  value={v.value}
                  onChange={e => {
                    const newVars = [...pipelineVariables];
                    newVars[idx].value = e.target.value;
                    setPipelineVariables(newVars);
                  }}
                />
                <button 
                  onClick={() => {
                    const newVars = [...pipelineVariables];
                    newVars.splice(idx, 1);
                    setPipelineVariables(newVars);
                  }}
                  className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-2.5 rounded-xl transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            ))}
            
            <button
              onClick={() => setPipelineVariables([...pipelineVariables, { key: '', value: '' }])}
              className="text-[11px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-4 py-2 rounded-xl flex items-center gap-2 self-start transition-all border border-blue-500/0 hover:border-blue-500/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              {t('add_variable')}
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
