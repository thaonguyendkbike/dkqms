import React from 'react';
import { ControlChartSeries, RankedItem } from './reportEngine';

export const QIndexGauge: React.FC<{
  score: number;
  grade: 'Xuất sắc' | 'Đạt chuẩn' | 'Cần cải thiện' | 'Cảnh báo';
  size?: number;
}> = ({ score, grade, size = 148 }) => {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  const strokeWidth = 13;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped >= 90
      ? '#16a34a' // green-600
      : clamped >= 75
        ? '#2563eb' // blue-600
        : clamped >= 60
          ? '#d97706' // amber-600
          : '#dc2626'; // red-600

  const badgeClass =
    clamped >= 90
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : clamped >= 75
        ? 'bg-blue-100 text-blue-800 border-blue-300'
        : clamped >= 60
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-rose-100 text-rose-800 border-rose-300';

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">
            {clamped.toFixed(1)}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            / 100 điểm
          </span>
        </div>
      </div>
      <span className={`mt-2 px-3 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}>
        {grade}
      </span>
    </div>
  );
};

export const ParetoSvgChart: React.FC<{
  items: RankedItem[];
  emptyMessage?: string;
}> = ({ items, emptyMessage = 'Không phát sinh dữ liệu trong kỳ' }) => {
  const top = items.slice(0, 8);
  if (top.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const width = 620;
  const height = 250;
  const padL = 44;
  const padR = 44;
  const padT = 22;
  const padB = 64;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxCount = Math.max(1, ...top.map((i) => i.count));
  const stepX = plotW / top.length;
  const barW = Math.min(44, stepX * 0.58);

  const linePoints = top.map((item, idx) => {
    const cx = padL + idx * stepX + stepX / 2;
    const cum = Math.min(100, Math.max(0, item.cumPct ?? 0));
    const cy = padT + plotH - (cum / 100) * plotH;
    return { cx, cy, cum };
  });

  const polyline = linePoints.map((p) => `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(' ');
  const y80 = padT + plotH * 0.2; // 80% from bottom

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-[460px]"
        role="img"
        aria-label="Biểu đồ Pareto 80/20"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padT + plotH * (1 - ratio);
          return (
            <g key={ratio}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text
                x={padL - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="#64748b"
                fontWeight={600}
              >
                {Math.round(maxCount * ratio)}
              </text>
              <text
                x={width - padR + 6}
                y={y + 4}
                textAnchor="start"
                fontSize={10}
                fill="#64748b"
                fontWeight={600}
              >
                {Math.round(ratio * 100)}%
              </text>
            </g>
          );
        })}

        {/* 80% threshold */}
        <line
          x1={padL}
          y1={y80}
          x2={width - padR}
          y2={y80}
          stroke="#ef4444"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <text x={width - padR - 4} y={y80 - 5} textAnchor="end" fontSize={10} fill="#dc2626" fontWeight={700}>
          Ngưỡng 80%
        </text>

        {/* Bars */}
        {top.map((item, idx) => {
          const cx = padL + idx * stepX + stepX / 2;
          const barH = (item.count / maxCount) * plotH;
          const x = cx - barW / 2;
          const y = padT + plotH - barH;
          const isVitalFew = (item.cumPct ?? 100) <= 85;
          const shortName = item.name.length > 13 ? `${item.name.slice(0, 12)}…` : item.name;
          return (
            <g key={`${item.name}-${idx}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(2, barH)}
                rx={4}
                fill={isVitalFew ? '#2563eb' : '#94a3b8'}
              />
              <text
                x={cx}
                y={Math.max(padT + 10, y - 5)}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill="#0f172a"
              >
                {item.count}
              </text>
              <text
                x={cx}
                y={padT + plotH + 14}
                textAnchor="end"
                transform={`rotate(-25 ${cx} ${padT + plotH + 14})`}
                fontSize={10}
                fill="#334155"
                fontWeight={600}
              >
                {shortName}
              </text>
            </g>
          );
        })}

        {/* Cumulative line */}
        {linePoints.length > 1 && (
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2.5}
            points={polyline}
          />
        )}
        {linePoints.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.cx} cy={p.cy} r={4} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5} />
            <text
              x={p.cx}
              y={Math.max(12, p.cy - 8)}
              textAnchor="middle"
              fontSize={9}
              fontWeight={700}
              fill="#b45309"
            >
              {p.cum.toFixed(0)}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export const PChartSvg: React.FC<{
  series: ControlChartSeries;
}> = ({ series }) => {
  if (series.insufficientData || series.points.length === 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 text-center">
        <p className="text-sm font-bold text-slate-700">Chưa đủ dữ liệu vẽ biểu đồ kiểm soát (p-chart)</p>
        <p className="mt-1 text-xs text-slate-500">
          {series.reason || 'Cần tối thiểu 5 điểm kiểm tra hợp lệ trong kỳ.'}
        </p>
      </div>
    );
  }

  const pts = series.points;
  const width = 620;
  const height = 240;
  const padL = 46;
  const padR = 24;
  const padT = 24;
  const padB = 46;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxY = Math.max(
    5,
    ...pts.map((p) => Math.max(p.ratePct, p.uclPct))
  ) * 1.15;

  const toY = (val: number) => padT + plotH - (Math.min(maxY, Math.max(0, val)) / maxY) * plotH;
  const stepX = pts.length > 1 ? plotW / (pts.length - 1) : plotW / 2;
  const toX = (idx: number) => (pts.length > 1 ? padL + idx * stepX : padL + plotW / 2);

  const pBarY = toY(series.pBarPct);
  const ratePolyline = pts.map((p, i) => `${toX(i).toFixed(1)},${toY(p.ratePct).toFixed(1)}`).join(' ');
  const uclPolyline = pts.map((p, i) => `${toX(i).toFixed(1)},${toY(p.uclPct).toFixed(1)}`).join(' ');
  const lclPolyline = pts.map((p, i) => `${toX(i).toFixed(1)},${toY(p.lclPct).toFixed(1)}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-[460px]"
        role="img"
        aria-label={series.title}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const val = maxY * r;
          const y = padT + plotH * (1 - r);
          return (
            <g key={r}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#64748b" fontWeight={600}>
                {val.toFixed(1)}%
              </text>
            </g>
          );
        })}

        {/* p-bar center line */}
        <line
          x1={padL}
          y1={pBarY}
          x2={width - padR}
          y2={pBarY}
          stroke="#16a34a"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />

        {/* UCL & LCL */}
        {pts.length > 1 && (
          <>
            <polyline fill="none" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="6 3" points={uclPolyline} />
            <polyline fill="none" stroke="#64748b" strokeWidth={1.2} strokeDasharray="3 3" points={lclPolyline} />
            <polyline fill="none" stroke="#2563eb" strokeWidth={2.5} points={ratePolyline} />
          </>
        )}

        {/* Points */}
        {pts.map((p, i) => {
          const x = toX(i);
          const y = toY(p.ratePct);
          const showLabel = pts.length <= 12 || i % Math.ceil(pts.length / 10) === 0 || i === pts.length - 1;
          return (
            <g key={`${p.label}-${i}`}>
              <circle
                cx={x}
                cy={y}
                r={p.outOfControl ? 5.5 : 4}
                fill={p.outOfControl ? '#dc2626' : '#2563eb'}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              {p.outOfControl && (
                <text x={x} y={Math.max(12, y - 9)} textAnchor="middle" fontSize={9} fontWeight={700} fill="#dc2626">
                  {p.ratePct.toFixed(1)}%
                </text>
              )}
              {showLabel && (
                <text
                  x={x}
                  y={padT + plotH + 16}
                  textAnchor="middle"
                  fontSize={9.5}
                  fill="#475569"
                  fontWeight={600}
                >
                  {p.label.length > 10 ? p.label.slice(0, 10) : p.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend top-right */}
        <g transform={`translate(${padL}, 10)`}>
          <text x={0} y={4} fontSize={10} fontWeight={700} fill="#16a34a">
            --- p̄: {series.pBarPct.toFixed(2)}%
          </text>
          <text x={115} y={4} fontSize={10} fontWeight={700} fill="#dc2626">
            --- UCL (giới hạn trên)
          </text>
          <text x={265} y={4} fontSize={10} fontWeight={700} fill="#2563eb">
            ● Tỷ lệ lỗi thực tế
          </text>
        </g>
      </svg>
    </div>
  );
};
