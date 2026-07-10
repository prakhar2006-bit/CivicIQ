import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import type { DashboardStats, IncidentContext, CivicReport } from '../lib/api';
import StatCards from '../components/StatCards';
import AgentPipeline, { buildPipelineStages } from '../components/AgentPipeline';
import ImpactGauge from '../components/ImpactGauge';
import RootCauseCard from '../components/RootCauseCard';
import ResponsePlan from '../components/ResponsePlan';
import ResolutionPanel from '../components/ResolutionPanel';
import DemoControls from '../components/DemoControls';
import { AlertCircle, Play, Layers, Clock, MapPin } from 'lucide-react';

export default function Dashboard() {
  const routerLocation = useLocation();
  const [stats, setStats] = useState<DashboardStats>({
    total_reports: 0,
    total_incidents: 0,
    active_incidents: 0,
    critical_incidents: 0,
    resolved_incidents: 0,
    reopened_incidents: 0,
    escalated_incidents: 0,
  });

  const [incidents, setIncidents] = useState<IncidentContext[]>([]);
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentContext | null>(null);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<any[]>(buildPipelineStages());

  // Load Dashboard Data
  const loadData = async () => {
    try {
      const statsRes = await api.getStats();
      setStats(statsRes);

      const incsRes = await api.getIncidents();
      const loadedIncs: IncidentContext[] = incsRes.incidents || [];
      setIncidents(loadedIncs);

      const repsRes = await api.getReports();
      setReports(repsRes.reports || []);

      // Refresh selected incident if one was selected
      if (selectedIncident) {
        const refreshed = loadedIncs.find(i => i.incident_id === selectedIncident.incident_id);
        if (refreshed) {
          setSelectedIncident(refreshed);
          // Set pipeline stages from the loaded incident state
          const refreshedStages = buildPipelineStages({
            perception: { status: 'complete', result: refreshed.perception_results[0] || {} },
            clustering: { status: 'complete', result: { cluster_size: refreshed.cluster.report_count } },
            incident_detection: { status: 'complete', result: { classification: refreshed.classification } },
            root_cause: { status: 'complete', result: refreshed.root_cause },
            impact: { status: 'complete', result: refreshed.impact_score },
            response: { status: 'complete', result: refreshed.response_plan },
            filing: { status: 'complete', result: { status: 'complete' } },
          } as any);
          setPipelineStages(refreshedStages);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle autoAnalyze from submission routing state
  useEffect(() => {
    const state = routerLocation.state as { autoAnalyzeId?: string } | null;
    if (state?.autoAnalyzeId) {
      handleRunAnalysis(state.autoAnalyzeId);
      // Clear navigation state
      window.history.replaceState({}, document.title);
    }
  }, [routerLocation.state]);

  const handleRunAnalysis = async (reportId: string) => {
    setRunningAnalysis(true);
    setPipelineStages(buildPipelineStages(undefined, true)); // Reset to running perception stage
    
    try {
      // Simulate step-by-step pipeline loading delay for visualization demo
      const res = await api.analyzeReport(reportId);
      
      // Step-by-step pipeline progression delay for the viewer
      await new Promise(r => setTimeout(r, 600));
      setPipelineStages(buildPipelineStages({ perception: res.stages.perception } as any, true));
      
      await new Promise(r => setTimeout(r, 600));
      setPipelineStages(buildPipelineStages({ perception: res.stages.perception, clustering: res.stages.clustering } as any, true));
      
      await new Promise(r => setTimeout(r, 600));
      setPipelineStages(buildPipelineStages({
        perception: res.stages.perception,
        clustering: res.stages.clustering,
        incident_detection: res.stages.incident_detection
      } as any, true));

      await new Promise(r => setTimeout(r, 600));
      setPipelineStages(buildPipelineStages({
        perception: res.stages.perception,
        clustering: res.stages.clustering,
        incident_detection: res.stages.incident_detection,
        root_cause: res.stages.root_cause
      } as any, true));

      await new Promise(r => setTimeout(r, 600));
      setPipelineStages(buildPipelineStages({
        perception: res.stages.perception,
        clustering: res.stages.clustering,
        incident_detection: res.stages.incident_detection,
        root_cause: res.stages.root_cause,
        impact: res.stages.impact
      } as any, true));

      await new Promise(r => setTimeout(r, 600));
      setPipelineStages(buildPipelineStages({
        perception: res.stages.perception,
        clustering: res.stages.clustering,
        incident_detection: res.stages.incident_detection,
        root_cause: res.stages.root_cause,
        impact: res.stages.impact,
        response: res.stages.response
      } as any, true));

      await new Promise(r => setTimeout(r, 400));
      setPipelineStages(buildPipelineStages(res.stages as any));

      await loadData();
      
      if (res.incident_id) {
        const found = incidents.find(i => i.incident_id === res.incident_id);
        if (found) {
          setSelectedIncident(found);
        } else {
          // Fallback load
          const refreshedIncs = await api.getIncidents();
          const matches = (refreshedIncs.incidents || []).find((i: any) => i.incident_id === res.incident_id);
          if (matches) setSelectedIncident(matches);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error during pipeline execution');
    } finally {
      setRunningAnalysis(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!selectedIncident) return;
    await api.approvePlan(selectedIncident.incident_id);
    await loadData();
  };

  const handleSelectIncident = (inc: IncidentContext) => {
    setSelectedIncident(inc);
    // Populate pipeline display stages from completed context
    const stages = buildPipelineStages({
      perception: { status: 'complete', result: inc.perception_results[0] || {} },
      clustering: { status: 'complete', result: { cluster_size: inc.cluster.report_count } },
      incident_detection: { status: 'complete', result: { classification: inc.classification } },
      root_cause: { status: 'complete', result: inc.root_cause },
      impact: { status: 'complete', result: inc.impact_score },
      response: { status: 'complete', result: inc.response_plan },
      filing: { status: 'complete', result: { status: 'complete' } },
    } as any);
    setPipelineStages(stages);
  };

  // Get status color badges for incidents list
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED': return <span className="badge badge-resolved">Resolved</span>;
      case 'ESCALATED': return <span className="badge badge-critical animate-pulse">Escalated</span>;
      case 'ACTION_IN_PROGRESS': return <span className="badge badge-medium">In Progress</span>;
      case 'RESOLUTION_REVIEW': return <span className="badge badge-high animate-pulse">Verification</span>;
      case 'REOPENED': return <span className="badge badge-high">Reopened</span>;
      default: return <span className="badge badge-low">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header with Dev control triggers */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            Authority Operations Dashboard
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            CivicIQ autonomous multi-agent pipeline monitoring interface.
          </span>
        </div>
        
        <div style={{ width: 340 }}>
          <DemoControls
            currentIncidentId={selectedIncident?.incident_id}
            onReset={async () => {
              setSelectedIncident(null);
              setPipelineStages(buildPipelineStages());
              await loadData();
            }}
            onTimeAdvanced={loadData}
          />
        </div>
      </div>

      {/* Stats Counter Row */}
      <StatCards stats={stats} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: 16,
        alignItems: 'start',
      }}>
        {/* Left Side: Feeds (Citizen Reports & Connected Incidents list) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Incident Intelligence Feed */}
          <div className="card" style={{ padding: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={15} color="var(--accent-blue)" />
              Incident Intelligence Feed
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {incidents.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '12px 0', textAlign: 'center' }}>
                  No active incidents detected.
                </div>
              ) : (
                incidents.map((inc) => (
                  <div
                    key={inc.incident_id}
                    onClick={() => handleSelectIncident(inc)}
                    style={{
                      padding: 10,
                      background: selectedIncident?.incident_id === inc.incident_id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      border: `1px solid ${selectedIncident?.incident_id === inc.incident_id ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {inc.incident_id}
                      </span>
                      {getStatusBadge(inc.status)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {inc.root_cause?.hypothesis || 'Causal relationship analysis pending...'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)' }}>
                      <span>{inc.connected_reports.length} reports</span>
                      <span className="badge" style={{
                        background: inc.impact_score?.priority === 'CRITICAL' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                        color: inc.impact_score?.priority === 'CRITICAL' ? 'var(--status-critical)' : 'var(--accent-blue)',
                        padding: '0 4px',
                      }}>
                        Impact: {Math.round(inc.impact_score?.score || 0)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Citizen Reports Feed (Awaiting Analysis / Linked status list) */}
          <div className="card" style={{ padding: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={15} color="var(--text-secondary)" />
              Citizen Reports Feed
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {reports.filter(r => r.status === 'SUBMITTED').length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '12px 0', textAlign: 'center' }}>
                  No new complaints pending pipeline analysis.
                </div>
              ) : (
                reports.filter(r => r.status === 'SUBMITTED').map((rep) => (
                  <div
                    key={rep.report_id}
                    style={{
                      padding: 10,
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {rep.report_id}
                      </span>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleRunAnalysis(rep.report_id)}
                        disabled={runningAnalysis}
                        style={{ padding: '3px 8px', fontSize: 10, gap: 4 }}
                      >
                        <Play size={10} />
                        Run Agentic AI
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      {rep.description}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>
                      <MapPin size={10} />
                      {rep.location.ward}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Agent pipeline animation & analysis results workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Agent Pipeline visualization card */}
          <AgentPipeline stages={pipelineStages} />

          {selectedIncident ? (
            /* Selected Incident Details Workspace */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Incident SLA alerts banner if Escalated */}
              {selectedIncident.status === 'ESCALATED' && (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--status-escalated-bg)',
                  border: '1px solid var(--status-escalated)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--status-escalated)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} />
                    SLA DEADLINE ESCALATED
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {selectedIncident.sla?.escalation_reason || 'Incident resolution deadline exceeded priority SLA. Escalated to Municipal Commissioner.'}
                  </p>
                </div>
              )}

              {/* Geo-temporal relationship mapping card */}
              <div className="card animate-fade-in" style={{ padding: 14 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Geo-Temporal Cluster Context
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
                  Geo-temporal proximity model connected <strong>{selectedIncident.connected_reports.length} citizen complaints</strong> within a <strong>{selectedIncident.cluster.radius_m} meter radius</strong>.
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: 10,
                  marginTop: 6,
                }}>
                  {selectedIncident.perception_results.map((p, idx) => (
                    <div key={idx} style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 6,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      <img
                        src={p.image_filename.startsWith('report_') 
                          ? `${API_BASE}/uploads/reports/${p.image_filename}` 
                          : `${API_BASE}/seed-images/${p.image_filename}`}
                        alt={p.report_id}
                        style={{ width: '100%', height: 70, objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)' }}>{p.report_id}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{p.issue_type.replace(/_/g, ' ')}</span>
                        <span className="badge badge-low" style={{ fontSize: 8, padding: '1px 3px', width: 'fit-content', marginTop: 2 }}>
                          {p.severity}
                        </span>
                        {p.visual_evidence && p.visual_evidence.length > 0 && (
                          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px solid var(--border-primary)', paddingTop: 4 }}>
                            <span style={{ fontSize: 8, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                              Visual Observations:
                            </span>
                            {p.visual_evidence.map((evidence, eIdx) => (
                              <span key={eIdx} style={{ fontSize: 8, color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                                • {evidence}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Gauge & Root Cause Investigation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
                <ImpactGauge
                  score={selectedIncident.impact_score.score}
                  priority={selectedIncident.impact_score.priority}
                  breakdown={selectedIncident.impact_score.breakdown}
                  explanation={selectedIncident.impact_score.explanation}
                />
                <RootCauseCard
                  hypothesis={selectedIncident.root_cause.hypothesis}
                  confidence={selectedIncident.root_cause.confidence}
                  evidence={selectedIncident.root_cause.evidence}
                  chain={selectedIncident.root_cause.chain}
                  disclaimer={selectedIncident.root_cause.disclaimer}
                />
              </div>

              {/* Department Response Plan & Resolution verification beat panel */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
                <ResponsePlan
                  incidentId={selectedIncident.incident_id}
                  steps={selectedIncident.response_plan.steps}
                  rationale={selectedIncident.response_plan.rationale}
                  approved={selectedIncident.response_plan.approved}
                  onApprove={handleApprovePlan}
                />
                <ResolutionPanel
                  incident={selectedIncident}
                  onRefresh={loadData}
                />
              </div>
            </div>
          ) : (
            /* Blank state waiting for selected incident / pipeline runs */
            <div className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              gap: 12,
            }}>
              <Layers size={36} color="var(--border-secondary)" />
              <div>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>No Incident Selected</h4>
                <p style={{ fontSize: 12, maxWidth: 300, margin: '4px auto 0', lineHeight: 1.4 }}>
                  Select an incident from the Intelligence Feed or trigger the Agentic AI analysis pipeline on a new citizen report.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
