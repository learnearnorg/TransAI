import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SuggestedGlossaryItem } from '../types';

interface SemanticWordGraphProps {
  terms: SuggestedGlossaryItem[];
  width?: number;
  height?: number;
}

const SemanticWordGraph: React.FC<SemanticWordGraphProps> = ({ terms, width = 800, height = 600 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || terms.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const nodes: any[] = [{ id: 'Root', group: 0, radius: 30 }];
    const links: any[] = [];

    terms.forEach((term, i) => {
      const radius = term.priority === 'High' ? 25 : term.priority === 'Medium' ? 18 : 12;
      nodes.push({
        id: term.term,
        group: 1,
        radius,
        definition: term.definition,
        priority: term.priority
      });
      links.push({
        source: 'Root',
        target: term.term,
        value: term.priority === 'High' ? 3 : term.priority === 'Medium' ? 2 : 1
      });
    });

    // Add some cross-links based on shared words in definitions (simple semantic linking)
    for (let i = 1; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const def1 = (nodes[i].definition || '').toLowerCase().split(' ');
        const def2 = (nodes[j].definition || '').toLowerCase().split(' ');
        const intersection = def1.filter((word: string) => word.length > 4 && def2.includes(word));
        if (intersection.length > 0) {
          links.push({
            source: nodes[i].id,
            target: nodes[j].id,
            value: intersection.length
          });
        }
      }
    }

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.radius + 10).iterations(2));

    const link = svg.append("g")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d: any) => Math.sqrt(d.value));

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d: any) => d.radius)
      .attr("fill", (d: any) => {
        if (d.id === 'Root') return '#4f46e5'; // Indigo 600
        if (d.priority === 'High') return '#ef4444'; // Red 500
        if (d.priority === 'Medium') return '#f59e0b'; // Amber 500
        return '#10b981'; // Emerald 500
      })
      .call(drag(simulation));

    node.append("title")
      .text((d: any) => d.id === 'Root' ? 'Lexicon Root' : `${d.id}\n${d.definition}`);

    const labels = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d: any) => d.id)
      .attr("font-size", (d: any) => d.id === 'Root' ? "14px" : "10px")
      .attr("font-weight", "bold")
      .attr("fill", "#1e293b")
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => d.radius + 12);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
        
      labels
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any;
    }

    return () => {
      simulation.stop();
    };
  }, [terms, width, height]);

  return (
    <div className="w-full h-full bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden relative shadow-inner">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
        <h4 className="font-black text-slate-800 uppercase tracking-widest mb-2">Semantic Graph</h4>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-600"></div><span className="text-slate-600 font-bold">Root Concept</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-slate-600 font-bold">High Priority</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-slate-600 font-bold">Medium Priority</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-slate-600 font-bold">Low Priority</span></div>
        </div>
      </div>
    </div>
  );
};

export default SemanticWordGraph;
