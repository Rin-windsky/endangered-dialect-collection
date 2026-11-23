"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { HomePayload, ItemCard, LanguageOption, MapRegion } from "@/lib/types";
import { SITE_SLOGAN } from "@/lib/constants";
import { ItemCard as ItemCardView } from "@/components/collections/ItemCard";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui/State";
import { Icon } from "@/components/ui/Icon";

export function HomeView() {
  const [home, setHome] = useState<HomePayload | null>(null);
  const [mapRegions, setMapRegions] = useState<MapRegion[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<HomePayload>("/home"),
      api.get<MapRegion[]>("/map/regions"),
      api.get<LanguageOption[]>("/languages?scope=public"),
    ])
      .then(([homeData, regionsData, languageData]) => {
        if (!active) return;
        setHome(homeData);
        setMapRegions(regionsData);
        setLanguages(languageData);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err, "首页内容加载失败"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const total = mapRegions.reduce((sum, region) => sum + region.count, 0);
  const topRegions = [...mapRegions].sort((a, b) => b.count - a.count).slice(0, 4);
  const featured: ItemCard[] = home?.featured ?? [];
  const latest: ItemCard[] = home?.latest ?? [];

  return (
    <div className="home-view">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">2026 Qoder 高校创造力大赛 · Hack4Good 技术向善</p>
            <h1 className="hero-title">
              <span>收藏那些</span>
              <span className="hero-em">正在远去</span>
              <span>的声音</span>
            </h1>
            <p className="hero-lead">
              {SITE_SLOGAN}
              把一段真实录音做成一件可以继续被听见、被阅读、被理解的收藏品，
              让方言不只是记忆里的腔调。
            </p>
            <div className="hero-actions">
              <Link href="/collections" className="btn btn-primary btn-lg">
                走进收藏馆
                <Icon name="arrow-right" size={17} />
              </Link>
              <Link href="/map" className="btn btn-outline btn-lg">
                <Icon name="map" size={17} />
                打开方言地图
              </Link>
            </div>
            <dl className="hero-stats">
              <div>
                <dt>公开收藏</dt>
                <dd><strong>{loading ? "—" : total}</strong><span>件</span></dd>
              </div>
              <div>
                <dt>覆盖地区</dt>
                <dd><strong>{loading ? "—" : mapRegions.length}</strong><span>个省级地区</span></dd>
              </div>
              <div>
                <dt>方言 / 语言</dt>
                <dd><strong>{loading ? "—" : languages.length}</strong><span>种</span></dd>
              </div>
            </dl>
          </div>

          <div className="hero-art" aria-hidden="true">
            <span className="hero-orbit orbit-1" />
            <span className="hero-orbit orbit-2" />
            <span className="hero-orbit orbit-3" />
            <div className="hero-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/visuals/hero-village.webp" alt="" />
              <span className="hero-frame-label">山野 · 方言 · 记忆</span>
            </div>
            <div className="hero-poem">
              <span>少小离家老大回</span>
              <span>乡音无改鬓毛衰</span>
              <small>贺知章《回乡偶书》</small>
            </div>
            <div className="hero-seal">
              <span>乡</span>
            </div>
            <div className="hero-caption">
              <Icon name="volume" size={14} />
              听见一方水土
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="container section">
          <ErrorState description={error} onRetry={() => setAttempt((value) => value + 1)} />
        </div>
      ) : (
        <>
          {loading ? (
            <div className="container section">
              <SkeletonGrid count={6} />
            </div>
          ) : (
            <>
              {featured.length > 0 ? (
                <section className="section">
                  <div className="container">
                    <div className="section-head">
                      <div>
                        <p className="eyebrow">SELECTED · 本期精选</p>
                        <h2 className="section-title">先听这一段</h2>
                      </div>
                      <Link href="/collections?sort=featured" className="section-link">
                        查看全部精选
                        <Icon name="arrow-up-right" size={15} />
                      </Link>
                    </div>
                    <div className="featured-grid">
                      {featured.map((item, index) => (
                        <ItemCardView key={item.id} item={item} index={index} />
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="section">
                <div className="container">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">LATEST · 新近入馆</p>
                      <h2 className="section-title">最近被收藏的声音</h2>
                    </div>
                    <Link href="/collections" className="section-link">
                      进入收藏馆
                      <Icon name="arrow-up-right" size={15} />
                    </Link>
                  </div>
                  {latest.length === 0 ? (
                    <EmptyState
                      title="收藏馆还没有公开内容"
                      description="第一条收藏品通过审核后，会出现在这里。"
                      action={
                        <Link href="/submit" className="btn btn-primary btn-sm">
                          我要投稿
                        </Link>
                      }
                    />
                  ) : (
                    <div className="latest-grid">
                      {latest.map((item, index) => (
                        <ItemCardView key={item.id} item={item} index={index} />
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="map-band">
                <div className="container map-band-inner">
                  <div className="map-band-copy">
                    <p className="eyebrow eyebrow-light">GEOGRAPHY · 声音地图</p>
                    <h2>从一张地图，<br />听见一方水土。</h2>
                    <p>
                      每一条收藏品都对应一个省级地区。地图上的数字来自公开收藏的真实统计，
                      点击有内容的地区，就能听见那里的声音。
                    </p>
                    <Link href="/map" className="btn btn-light btn-lg">
                      去地图上看看
                      <Icon name="arrow-right" size={17} />
                    </Link>
                    <p className="map-band-note">只展示有收藏的省级地区，不采集任何精确位置。</p>
                  </div>
                  <div className="map-band-art">
                    <div className="map-region-list">
                      {topRegions.length === 0 ? (
                        <p className="map-band-empty">还没有公开收藏的地区</p>
                      ) : (
                        topRegions.map((region) => (
                          <Link
                            key={region.regionId}
                            href={`/collections?regionId=${encodeURIComponent(region.regionId)}`}
                            className="map-region-row"
                          >
                            <span className="map-region-name">{region.name}</span>
                            <span className="map-region-line" aria-hidden="true" />
                            <span className="map-region-count">{region.count} 件</span>
                            <Icon name="arrow-up-right" size={14} />
                          </Link>
                        ))
                      )}
                      {mapRegions.length > 4 ? (
                        <p className="map-region-more">还有 {mapRegions.length - 4} 个地区已有收藏</p>
                      ) : null}
                    </div>
                    <span className="map-band-orbit" aria-hidden="true" />
                    <span className="map-band-orbit orbit-b" aria-hidden="true" />
                  </div>
                </div>
              </section>

              <section className="submit-band">
                <div className="container submit-band-inner">
                  <div>
                    <p className="eyebrow">CONTRIBUTE · 共建收藏馆</p>
                    <h2>你家里，<br />也有一句舍不得忘的话吗？</h2>
                  </div>
                  <div className="submit-band-side">
                    <p>
                      不需要专业设备。一段手机录下的声音、一句方言、一个故事，
                      都可以成为一件收藏品。审核通过后，它会在这里被继续听见。
                    </p>
                    <Link href="/submit" className="btn btn-primary btn-lg">
                      我要投稿
                      <Icon name="arrow-up-right" size={17} />
                    </Link>
                  </div>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}