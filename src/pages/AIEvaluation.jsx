import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Sparkles,
  FileSearch,
  Database,
  CheckCircle2,
  FlaskConical,
  ArrowRight,
} from 'lucide-react';
import { api } from '../data/api';
import { buildCorpusModel, computePairSimilarity } from '../utils/matcher';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Input from '../components/Input';

export default function AIEvaluation() {
  const [evalData, setEvalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Interactive Sandbox pre-loaded with the semantic wallet/purse example
  const [sampleLostTitle, setSampleLostTitle] = useState('Black Leather Wallet with ATM & College ID');
  const [sampleLostDesc, setSampleLostDesc] = useState(
    'Black leather wallet containing an ATM card and college ID.'
  );
  const [sampleFoundTitle, setSampleFoundTitle] = useState('Dark Black Purse near University Library');
  const [sampleFoundDesc, setSampleFoundDesc] = useState(
    'Found a dark black purse near the university library with some identification cards.'
  );
  const sampleCategory = 'id-card';
  const sampleLocation = 'Main Library';

  useEffect(() => {
    let cancelled = false;
    api
      .getEvaluation()
      .then((res) => {
        if (!cancelled && res?.evaluation) {
          setEvalData(res.evaluation);
        }
      })
      .catch((err) => console.error('Evaluation load error:', err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sandboxResult = useMemo(() => {
    const lost = {
      id: 'sandbox-lost',
      type: 'lost',
      title: sampleLostTitle,
      description: sampleLostDesc,
      category: sampleCategory,
      location: sampleLocation,
      date: '2026-11-20',
    };
    const found = {
      id: 'sandbox-found',
      type: 'found',
      title: sampleFoundTitle,
      description: sampleFoundDesc,
      category: sampleCategory,
      location: sampleLocation,
      date: '2026-11-20',
    };
    const model = buildCorpusModel([lost, found]);
    const sbert = computePairSimilarity(lost, found, model, { algorithm: 'sbert' });
    const tfidf = computePairSimilarity(lost, found, model, { algorithm: 'tfidf' });
    return { sbert, tfidf };
  }, [sampleLostTitle, sampleLostDesc, sampleFoundTitle, sampleFoundDesc, sampleCategory, sampleLocation]);

  const metricsRows = evalData
    ? [
        {
          key: 'precisionAt1',
          label: 'Precision@1 (Top-1 Accuracy)',
          tfidf: evalData.tfidf.precisionAt1,
          sbert: evalData.sbert.precisionAt1,
          desc: 'Fraction of lost queries where the true matching found report ranked #1.',
        },
        {
          key: 'precisionAt5',
          label: 'Precision@5',
          tfidf: evalData.tfidf.precisionAt5,
          sbert: evalData.sbert.precisionAt5,
          desc: 'Proportion of relevant ground-truth items among the top-5 ranked candidates.',
        },
        {
          key: 'recallAt5',
          label: 'Recall@5 (Top-5 Hit Rate)',
          tfidf: evalData.tfidf.recallAt5,
          sbert: evalData.sbert.recallAt5,
          desc: 'Fraction of ground-truth found items retrieved within the top 5 results.',
        },
        {
          key: 'mrr',
          label: 'Mean Reciprocal Rank (MRR)',
          tfidf: evalData.tfidf.mrr,
          sbert: evalData.sbert.mrr,
          desc: 'Average of 1/rank of the true matching found report across all queries.',
        },
      ]
    : [];

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <span className="eyebrow">Academic Demonstration &amp; Benchmarking</span>
          <h1>AI Model Performance Dashboard</h1>
          <p className="page-header__lead">
            Empirical evaluation comparing the <strong>TF-IDF + Cosine Similarity</strong> baseline
            against <strong>Sentence-BERT + Cosine Similarity</strong> on a manually labeled
            campus dataset. All metrics are computed live from ground-truth predictions.
          </p>
        </div>
      </section>

      <section className="section section--compact">
        <div className="container">
          {isLoading || !evalData ? (
            <Card>
              <p>Computing live evaluation metrics from ground-truth dataset...</p>
            </Card>
          ) : (
            <>
              {/* Dataset Summary Cards */}
              <div className="grid grid--4" style={{ marginBottom: '2rem' }}>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <div className="stat-card__icon"><Database size={20} /></div>
                  </div>
                  <div className="stat-card__value">{evalData.datasetSize}</div>
                  <div className="stat-card__label">Total Dataset Reports</div>
                  <div className="stat-card__note">
                    {evalData.lostReportsCount} Lost · {evalData.foundReportsCount} Found
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-card__top">
                    <div className="stat-card__icon"><CheckCircle2 size={20} /></div>
                  </div>
                  <div className="stat-card__value">{evalData.groundTruthPairsCount}</div>
                  <div className="stat-card__label">Ground-Truth Pairs</div>
                  <div className="stat-card__note">Manually labeled campus pairs</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card__top">
                    <div className="stat-card__icon"><FileSearch size={20} /></div>
                  </div>
                  <div className="stat-card__value">
                    {(evalData.tfidf.mrr * 100).toFixed(1)}%
                  </div>
                  <div className="stat-card__label">TF-IDF Cosine MRR</div>
                  <div className="stat-card__note">
                    Top-1 Hits: {evalData.tfidf.hitsAt1}/{evalData.tfidf.totalQueries}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-card__top">
                    <div className="stat-card__icon"><Sparkles size={20} /></div>
                  </div>
                  <div className="stat-card__value">
                    {(evalData.sbert.mrr * 100).toFixed(1)}%
                  </div>
                  <div className="stat-card__label">Sentence-BERT MRR</div>
                  <div className="stat-card__note">
                    Top-1 Hits: {evalData.sbert.hitsAt1}/{evalData.sbert.totalQueries}
                  </div>
                </div>
              </div>

              {/* Visual Bar Chart & Comparison Table */}
              <div className="eval-two-col" style={{ marginBottom: '2rem' }}>
                <Card>
                  <span className="eyebrow">Visual Benchmark</span>
                  <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={20} style={{ color: 'var(--bronze-700)' }} />
                    TF-IDF vs. Sentence-BERT Metric Chart
                  </h2>

                  <div className="eval-chart">
                    {metricsRows.map((m) => {
                      const tfidfPct = Math.round(m.tfidf * 100);
                      const sbertPct = Math.round(m.sbert * 100);
                      return (
                        <div key={m.key} className="eval-chart__group">
                          <div className="eval-chart__label">
                            <strong>{m.label}</strong>
                            <span>{m.desc}</span>
                          </div>
                          <div className="eval-chart__bars">
                            <div className="eval-chart__row">
                              <span className="eval-chart__method">TF-IDF Cosine</span>
                              <div className="eval-chart__track">
                                <div
                                  className="eval-chart__fill eval-chart__fill--tfidf"
                                  style={{ width: `${tfidfPct}%` }}
                                />
                              </div>
                              <strong className="eval-chart__val">{m.tfidf.toFixed(3)}</strong>
                            </div>
                            <div className="eval-chart__row">
                              <span className="eval-chart__method">Sentence-BERT</span>
                              <div className="eval-chart__track">
                                <div
                                  className="eval-chart__fill eval-chart__fill--sbert"
                                  style={{ width: `${sbertPct}%` }}
                                />
                              </div>
                              <strong className="eval-chart__val">{m.sbert.toFixed(3)}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <Card compact>
                    <span className="eyebrow">Metric Summary Table</span>
                    <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '1rem' }}>
                      Performance Comparison
                    </h2>
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Metric</th>
                            <th>TF-IDF Cosine</th>
                            <th>Sentence-BERT</th>
                            <th>Gain</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metricsRows.map((m) => {
                            const diff = m.sbert - m.tfidf;
                            return (
                              <tr key={m.key}>
                                <td><strong>{m.label.split(' (')[0]}</strong></td>
                                <td>{m.tfidf.toFixed(3)}</td>
                                <td><strong>{m.sbert.toFixed(3)}</strong></td>
                                <td style={{ color: diff >= 0 ? 'var(--verified-text)' : 'var(--mocha-600)', fontWeight: 600 }}>
                                  {diff >= 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card sand compact>
                    <span className="eyebrow">Algorithm Explanation</span>
                    <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: '0.5rem' }}>
                      Why Sentence-BERT improves campus item retrieval
                    </h3>
                    <p style={{ fontSize: 'var(--text-sm)', marginBottom: '0.6rem' }}>
                      <strong>1. TF-IDF + Cosine Similarity (Baseline):</strong> Converts cleaned
                      item descriptions into sparse term-frequency inverse-document-frequency
                      vectors. It excels when reporters use identical words (e.g. brand names like{' '}
                      <code>CLRS</code> or <code>Casio</code>), but struggles when a student reports
                      a <em>"wallet with ATM card"</em> and a finder logs a{' '}
                      <em>"purse with identification cards"</em>.
                    </p>
                    <p style={{ fontSize: 'var(--text-sm)' }}>
                      <strong>2. Sentence-BERT + Cosine Similarity:</strong> Maps descriptions into
                      dense semantic representations so synonyms and paraphrased campus concepts
                      align closely in vector space, achieving higher Precision@1 and Mean
                      Reciprocal Rank (MRR).
                    </p>
                  </Card>
                </div>
              </div>

              {/* Interactive Live Semantic Sandbox */}
              <Card style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <span className="eyebrow">Interactive Demonstration Sandbox</span>
                    <h2 style={{ fontSize: 'var(--text-2xl)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FlaskConical size={20} style={{ color: 'var(--bronze-700)' }} />
                      Test Live Description Similarity (Wallet vs. Purse Example)
                    </h2>
                  </div>
                  <Badge status="matched">
                    Sentence-BERT: {sandboxResult.sbert.sbertSimilarity.toFixed(2)} vs TF-IDF:{' '}
                    {sandboxResult.tfidf.tfidfCosine.toFixed(2)}
                  </Badge>
                </div>

                <div className="eval-sandbox-grid">
                  <div>
                    <Input
                      id="sb-lost-title"
                      label="Lost Report Title"
                      value={sampleLostTitle}
                      onChange={(e) => setSampleLostTitle(e.target.value)}
                    />
                    <Input
                      id="sb-lost-desc"
                      label="Lost Report Description"
                      multiline
                      rows={3}
                      value={sampleLostDesc}
                      onChange={(e) => setSampleLostDesc(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      id="sb-found-title"
                      label="Found Report Title"
                      value={sampleFoundTitle}
                      onChange={(e) => setSampleFoundTitle(e.target.value)}
                    />
                    <Input
                      id="sb-found-desc"
                      label="Found Report Description"
                      multiline
                      rows={3}
                      value={sampleFoundDesc}
                      onChange={(e) => setSampleFoundDesc(e.target.value)}
                    />
                  </div>
                </div>

                <div className="eval-sandbox-result">
                  <div className="eval-sandbox-score">
                    <span>TF-IDF Cosine (Lexical)</span>
                    <strong>{sandboxResult.tfidf.tfidfCosine.toFixed(3)}</strong>
                    <small>Final w/ Context: {Math.round(sandboxResult.tfidf.score * 100)}%</small>
                  </div>
                  <div className="eval-sandbox-score eval-sandbox-score--highlight">
                    <span>Sentence-BERT (Semantic)</span>
                    <strong>{sandboxResult.sbert.sbertSimilarity.toFixed(3)}</strong>
                    <small>Final w/ Context: {Math.round(sandboxResult.sbert.score * 100)}%</small>
                  </div>
                  <div style={{ flex: 2, minWidth: '240px' }}>
                    <strong style={{ display: 'block', fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--bronze-700)', marginBottom: '0.3rem' }}>
                      Detected Semantic Concepts &amp; Reasons
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 'var(--text-xs)', color: 'var(--mocha-900)' }}>
                      {sandboxResult.sbert.matchingReasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Ground-Truth Pair-by-Pair Evaluation Table */}
              <Card compact>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <span className="eyebrow">Ground-Truth Dataset ({evalData.groundTruthPairsCount} Pairs)</span>
                    <h2 style={{ fontSize: 'var(--text-2xl)' }}>
                      Pair-by-Pair Ranking &amp; Score Comparison
                    </h2>
                  </div>
                  <Button to="/matches" variant="secondary" size="sm">
                    Open Live Campus Matches <ArrowRight size={14} />
                  </Button>
                </div>

                <div className="table-wrapper">
                  <div className="table-scroll">
                    <table className="table table--responsive">
                      <thead>
                        <tr>
                          <th>Pair ID</th>
                          <th>Lost Report</th>
                          <th>Ground-Truth Found Report</th>
                          <th>TF-IDF (Score / Rank)</th>
                          <th>Sentence-BERT (Score / Rank)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evalData.sampleComparisons.map((row) => (
                          <tr key={row.pairCode}>
                            <td data-label="Pair ID" className="td--title">
                              <strong>{row.pairCode}</strong>
                            </td>
                            <td data-label="Lost Report" className="td--block">
                              <div style={{ fontWeight: 600 }}>{row.lostTitle}</div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                                {row.lostDescription}
                              </div>
                            </td>
                            <td data-label="Found Report" className="td--block">
                              <div style={{ fontWeight: 600 }}>{row.foundTitle}</div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                                {row.foundDescription}
                              </div>
                            </td>
                            <td data-label="TF-IDF">
                              <code>{row.tfidfCosine.toFixed(3)}</code> ·{' '}
                              <Badge variant={row.tfidfRank === 1 ? 'verified' : 'claim-pending'}>
                                Rank #{row.tfidfRank}
                              </Badge>
                            </td>
                            <td data-label="Sentence-BERT">
                              <code>{row.sbertSimilarity.toFixed(3)}</code> ·{' '}
                              <Badge variant={row.sbertRank === 1 ? 'verified' : 'claim-pending'}>
                                Rank #{row.sbertRank}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </section>

      <style>{`
        .eval-two-col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (min-width: 1024px) {
          .eval-two-col {
            grid-template-columns: 1.15fr 0.85fr;
          }
        }

        .eval-chart {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }

        .eval-chart__label {
          margin-bottom: 0.45rem;
        }

        .eval-chart__label strong {
          display: block;
          font-size: var(--text-sm);
          color: var(--mocha-900);
        }

        .eval-chart__label span {
          font-size: var(--text-xs);
          color: var(--mocha-600);
        }

        .eval-chart__bars {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .eval-chart__row {
          display: grid;
          grid-template-columns: 115px 1fr 48px;
          align-items: center;
          gap: 0.65rem;
          font-size: var(--text-xs);
        }

        .eval-chart__method {
          color: var(--mocha-600);
          font-weight: 600;
        }

        .eval-chart__track {
          height: 12px;
          background-color: var(--sand-200);
          border-radius: var(--radius-pill);
          overflow: hidden;
          border: 1px solid var(--sand-300);
        }

        .eval-chart__fill {
          height: 100%;
          border-radius: var(--radius-pill);
          transition: width 400ms ease;
        }

        .eval-chart__fill--tfidf {
          background-color: var(--taupe-500);
        }

        .eval-chart__fill--sbert {
          background: linear-gradient(90deg, var(--bronze-700), var(--bronze-500));
        }

        .eval-chart__val {
          text-align: right;
          color: var(--mocha-900);
        }

        .eval-sandbox-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .eval-sandbox-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .eval-sandbox-result {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 1rem;
          background-color: var(--cream-100);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          align-items: center;
        }

        .eval-sandbox-score {
          flex: 1;
          min-width: 145px;
          padding: 0.75rem;
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
        }

        .eval-sandbox-score--highlight {
          background-color: var(--sand-200);
          border-color: var(--bronze-500);
        }

        .eval-sandbox-score span {
          font-size: var(--text-xs);
          color: var(--mocha-600);
          font-weight: 600;
        }

        .eval-sandbox-score strong {
          font-family: var(--font-serif);
          font-size: var(--text-3xl);
          color: var(--mocha-900);
          line-height: 1.15;
        }

        .eval-sandbox-score small {
          font-size: var(--text-xs);
          color: var(--bronze-700);
        }
      `}</style>
    </div>
  );
}
