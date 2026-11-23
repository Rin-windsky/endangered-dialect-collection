"use client";

import { useEffect, useRef, useState } from "react";
import type { MapRegion } from "@/lib/types";
import { LoadingBlock } from "@/components/ui/State";

type ECharts = typeof import("echarts");

export function ChinaMap({
  regions,
  selectedId,
  onSelect,
  onHover,
}: {
  regions: MapRegion[];
  selectedId?: string | null;
  onSelect: (region: MapRegion) => void;
  onHover?: (regionId: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<import("echarts").ECharts | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    async function boot() {
      setStatus("loading");
      try {
        const [echartsModule, geoResponse] = await Promise.all([
          import("echarts"),
          fetch("/maps/china-provinces.json"),
        ]);
        if (!geoResponse.ok) throw new Error("map data failed");
        const geoJson = await geoResponse.json();
        if (disposed || !containerRef.current) return;
        const echarts = echartsModule as ECharts;
        if (!echarts.getMap("xiangyin-china")) {
          echarts.registerMap("xiangyin-china", geoJson);
        }
        chartRef.current?.dispose();
        const chart = echarts.init(containerRef.current, undefined, { renderer: "canvas" });
        chartRef.current = chart;

        const max = Math.max(1, ...regions.map((region) => region.count));
        const data = regions.map((region) => ({
          name: region.mapKey,
          value: region.count,
          regionId: region.regionId,
        }));

        chart.setOption({
          backgroundColor: "transparent",
          tooltip: {
            trigger: "item",
            backgroundColor: "rgba(28, 32, 26, 0.94)",
            borderWidth: 0,
            padding: [10, 14],
            textStyle: { color: "#F4EEE2", fontSize: 12 },
            formatter: (params: unknown) => {
              const point = params as { name?: string; value?: number; data?: { regionId?: string } };
              const region = regions.find((entry) => entry.regionId === point.data?.regionId);
              if (!region) return point.name ?? "";
              return `${region.name}<br/><span style="opacity:.7">已收藏 ${region.count} 件</span>`;
            },
          },
          visualMap: {
            show: false,
            min: 1,
            max,
            inRange: { color: ["#C8B48C", "#A9553B", "#8E3826"] },
          },
          series: [
            {
              type: "map",
              map: "xiangyin-china",
              nameProperty: "name",
              roam: false,
              zoom: 1.08,
              layoutCenter: ["50%", "49%"],
              layoutSize: "108%",
              selectedMode: false,
              label: { show: false },
              itemStyle: {
                areaColor: "#E8DFCE",
                borderColor: "#BDAF94",
                borderWidth: 0.8,
              },
              emphasis: {
                label: {
                  show: true,
                  color: "#FBF7EF",
                  fontSize: 11,
                  lineHeight: 16,
                  formatter: (params: unknown) => {
                    const point = params as { name?: string; value?: number };
                    return point.value ? `${point.name}\n ${point.value} 件` : `${point.name}`;
                  },
                },
                itemStyle: { areaColor: "#B0503A", borderColor: "#8E3826", borderWidth: 1.2 },
              },
              select: { disabled: true },
              data,
            },
          ],
        });

        chart.on("click", (params: { name?: string }) => {
          const region = regions.find((entry) => entry.mapKey === params.name);
          if (region) onSelect(region);
        });
        chart.on("mouseover", (params: { name?: string }) => {
          const region = regions.find((entry) => entry.mapKey === params.name);
          onHover?.(region?.regionId ?? null);
        });
        chart.on("mouseout", () => onHover?.(null));

        resizeObserver = new ResizeObserver(() => chart.resize());
        resizeObserver.observe(containerRef.current);
        setStatus("ready");
      } catch {
        if (!disposed) setStatus("error");
      }
    }

    void boot();
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, regions]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || status !== "ready") return;
    chart.dispatchAction({ type: "downplay", seriesIndex: 0 });
    const target = regions.find((region) => region.regionId === selectedId);
    if (target) {
      chart.dispatchAction({ type: "highlight", seriesIndex: 0, name: target.mapKey });
    }
  }, [selectedId, regions, status]);

  return (
    <div className="map-canvas-wrap">
      <div
        ref={containerRef}
        className="map-canvas"
        role="img"
        aria-label="中国省级方言收藏分布地图，可点击有内容的省份进入收藏馆"
      />
      {status === "loading" ? (
        <div className="map-loading">
          <LoadingBlock label="正在铺设地图" lines={2} />
        </div>
      ) : null}
      {status === "error" ? (
        <div className="map-loading">
          <div className="state-box">
            <p className="state-title">地图加载失败</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAttempt((value) => value + 1)}>
              重新加载
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}