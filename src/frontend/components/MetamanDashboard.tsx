import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, Search, ArrowRight, RefreshCcw } from 'lucide-react';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, align: 'DL', nodesep: 60, ranksep: 200 });

  nodes.forEach((node) => {
    // 預設寬高
    dagreGraph.setNode(node.id, { width: 220, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? 'left' : 'top';
    node.sourcePosition = isHorizontal ? 'right' : 'bottom';
    node.position = {
      x: nodeWithPosition.x - 220 / 2,
      y: nodeWithPosition.y - 80 / 2,
    };
    return node;
  });

  return { nodes, edges };
};

export default function MetamanDashboard() {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const [lineageData, setLineageData] = useState<{ nodes: any[], edges: any[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchLineage = async (impactKeyword?: string) => {
    setLoading(true);
    setSelectedNodeId(null);
    try {
      const url = impactKeyword 
          ? `/api/metaman/impact?keyword=${encodeURIComponent(impactKeyword)}` 
          : `/api/metaman/lineage`;
      const res = await fetch(url);
      const data = await res.json();
      
      setLineageData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLineage();
  }, []);

  const handleImpactAnalysis = () => {
    fetchLineage(keyword);
  };

  const handleReset = () => {
    setKeyword('');
    fetchLineage();
  };

  const getConnectedElements = (nodeId: string, graphEdges: any[]) => {
    const connectedNodes = new Set<string>([nodeId]);
    const connectedEdges = new Set<string>();

    // Trace Upstream
    let stack = [nodeId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      graphEdges.forEach((edge, i) => {
        if (edge.target === current) {
          connectedEdges.add(`e_${edge.source}_${edge.target}_${i}`);
          if (!connectedNodes.has(edge.source)) {
            connectedNodes.add(edge.source);
            stack.push(edge.source);
          }
        }
      });
    }

    // Trace Downstream
    stack = [nodeId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      graphEdges.forEach((edge, i) => {
        if (edge.source === current) {
          connectedEdges.add(`e_${edge.source}_${edge.target}_${i}`);
          if (!connectedNodes.has(edge.target)) {
            connectedNodes.add(edge.target);
            stack.push(edge.target);
          }
        }
      });
    }

    return { connectedNodes, connectedEdges };
  };

  useEffect(() => {
    if (lineageData.nodes.length === 0) return;

    const { connectedNodes, connectedEdges } = selectedNodeId 
      ? getConnectedElements(selectedNodeId, lineageData.edges)
      : { connectedNodes: null, connectedEdges: null };

    const initialNodes: Node[] = lineageData.nodes.map((n) => {
      const isConnected = connectedNodes ? connectedNodes.has(n.id) : true;
      return {
        id: n.id,
        data: { label: (
            <div className="flex flex-col text-center justify-center items-center h-full gap-1">
               <span className="text-[10px] text-[var(--accent-blue-text)] uppercase tracking-widest leading-none">{n.pipeline}</span>
               <span className="font-semibold text-xs text-[var(--text-primary)] leading-tight">{n.label}</span>
            </div>
        ) },
        position: { x: 0, y: 0 },
        className: `border-2 ${
          n.type === 'source' ? 'border-blue-600 bg-blue-900/50' :
          n.type === 'destination' ? 'border-green-600 bg-green-900/50' : 'border-purple-600 bg-purple-900/50'
        } rounded-lg shadow-sm w-[220px] h-[80px] transition-all duration-300 ${!isConnected ? 'opacity-30 scale-95 grayscale' : 'opacity-100 scale-100'} ${selectedNodeId === n.id ? 'ring-2 ring-[var(--accent-blue)] shadow-lg' : ''}`,
        type: 'default'
      } as any;
    });

    const initialEdges: Edge[] = lineageData.edges.map((e, i) => {
      const edgeId = `e_${e.source}_${e.target}_${i}`;
      const isConnected = connectedEdges ? connectedEdges.has(edgeId) : true;
      return {
        id: edgeId,
        source: e.source,
        target: e.target,
        animated: e.isCrossPipeline,
        style: { 
          stroke: e.isCrossPipeline ? '#ef4444' : '#64748b', 
          strokeWidth: isConnected ? 2 : 1,
          opacity: isConnected ? 1 : 0.15,
          transition: 'all 0.3s ease'
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: e.isCrossPipeline ? '#ef4444' : '#64748b' }
      };
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      'LR'
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [lineageData, selectedNodeId, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return (
    <div className="flex h-full w-full bg-[var(--surface-base)] relative overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[var(--accent-blue)]" /> {t('metaman_title')}
          </h2>
          
          <div className="flex items-center gap-3">
              <div className="relative">
                 <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
                 <input 
                   type="text" 
                   placeholder={t('search_table')} 
                   value={keyword}
                   onChange={(e) => setKeyword(e.target.value)}
                   className="pl-9 pr-4 py-1.5 bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors w-64"
                   onKeyDown={(e) => e.key === 'Enter' && handleImpactAnalysis()}
                 />
              </div>
              <button 
                 onClick={handleImpactAnalysis}
                 className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-blue)] text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
              >
                 {t('analyze_impact')}
              </button>
              <button 
                 onClick={handleReset}
                 className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                 <RefreshCcw className="w-4 h-4" /> {t('reset')}
              </button>
          </div>
        </div>

        <div className="flex-1 w-full bg-[var(--surface-overlay)] relative">
           {loading ? (
               <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-overlay)] z-10 opacity-80 backdrop-blur-sm">
                   <div className="flex flex-col items-center gap-3">
                     <RefreshCcw className="w-8 h-8 text-[var(--accent-blue)] animate-spin" />
                     <span className="font-semibold text-[var(--text-secondary)]">{t('loading_lineage')}</span>
                   </div>
               </div>
           ) : null}
           <ReactFlow 
              nodes={nodes} 
              edges={edges} 
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              fitView 
              attributionPosition="bottom-right"
              minZoom={0.1}
              maxZoom={2}
              colorMode="dark"
           >
               <Background color="var(--border-strong)" gap={16} />
               <Controls className="bg-[var(--surface-overlay)] border-[var(--border-subtle)] fill-[var(--text-primary)] text-[var(--text-primary)]" />
           </ReactFlow>
           
           {/* Legend */}
           <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-6 text-sm text-[var(--text-secondary)] font-medium justify-center items-center bg-[var(--surface-raised)] py-2 px-4 rounded-full border border-[var(--border-subtle)] shadow-lg z-10">
             <span className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-900 border border-blue-400 rounded-sm"></div> {t('source')}</span>
             <span className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-900 border border-purple-400 rounded-sm"></div> {t('transform')}</span>
             <span className="flex items-center gap-2"><div className="w-3 h-3 bg-green-900 border border-green-400 rounded-sm"></div> {t('destination')}</span>
             <span className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-red-500" /> {t('cross_pipeline')}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
