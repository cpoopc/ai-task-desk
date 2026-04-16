import re
from typing import Optional
from mission_control.domain.models import Brief, CrossTaskLink
from mission_control.domain.enums import LinkType
from mission_control.repositories.brief_repo import BriefRepoAsyncSQLite
from mission_control.repositories.link_repo import LinkRepoAsyncSQLite


class TagExtractionEngine:
    TECH_KEYWORDS = {
        "caffeine": ["caffeine", "cache"],
        "redis": ["redis"],
        "spring": ["spring", "springboot", "spring-boot"],
        "kafka": ["kafka"],
        "grpc": ["grpc", "grpc"],
        "postgres": ["postgres", "postgresql"],
    }

    PATTERNS = {
        "caching": r"cache|LRU|TTL",
        "feature-flag": r"feature.?flag|launchdarkly",
        "circuit-breaker": r"circuit.?breaker|resilience4j",
    }

    def extract(self, brief: Brief) -> dict[str, list[str]]:
        text = f"{brief.title} {brief.goal} {brief.technical_details}"

        tags = {
            "technologies": self._match_keywords(text, self.TECH_KEYWORDS),
            "patterns": self._match_patterns(text, self.PATTERNS),
            "services": self._extract_services(brief),
            "conventions": self._extract_conventions(brief),
            "constraints": [c.lower().strip() for c in brief.constraints],
        }

        return tags

    def _match_keywords(self, text: str, keywords: dict[str, list[str]]) -> list[str]:
        text_lower = text.lower()
        matched = []
        for category, words in keywords.items():
            if any(word in text_lower for word in words):
                matched.append(category)
        return matched

    def _match_patterns(self, text: str, patterns: dict[str, str]) -> list[str]:
        matched = []
        for pattern_name, pattern in patterns.items():
            if re.search(pattern, text, re.IGNORECASE):
                matched.append(pattern_name)
        return matched

    def _extract_services(self, brief: Brief) -> list[str]:
        services = []
        if brief.folder_name:
            services.append(brief.folder_name.lower())
        return services

    def _extract_conventions(self, brief: Brief) -> list[str]:
        conventions = []
        text = f"{brief.goal} {brief.technical_details}"
        if "api" in text.lower():
            conventions.append("api-design")
        if "database" in text.lower() or "db" in text.lower():
            conventions.append("database")
        if "test" in text.lower():
            conventions.append("testing")
        return conventions


class LinkDetectionEngine:
    WEIGHTS = {
        "conventions": 0.6,
        "patterns": 0.5,
        "services": 0.4,
        "technologies": 0.3,
        "constraints": 0.3,
    }

    def __init__(self, tag_engine: TagExtractionEngine):
        self.tag_engine = tag_engine

    def detect_all(self, briefs: list[Brief]) -> list[CrossTaskLink]:
        tags_map = {b.id: self.tag_engine.extract(b) for b in briefs}
        links = []

        for i, a in enumerate(briefs):
            for b in briefs[i + 1 :]:
                score, method, matched = self._calculate_similarity(tags_map[a.id], tags_map[b.id])

                if score >= 0.6:
                    link_type = LinkType.auto
                elif score >= 0.3:
                    link_type = LinkType.suggested
                else:
                    continue

                links.append(
                    CrossTaskLink(
                        id=f"{a.id}-{b.id}",
                        source_path=a.folder_path,
                        target_path=b.folder_path,
                        link_type=link_type,
                        match_method=method,
                        score=score,
                        matched_tags=matched,
                    )
                )

        return links

    def _calculate_similarity(self, tags_a: dict, tags_b: dict) -> tuple[float, str, list[str]]:
        total_score = 0.0
        total_weight = 0.0
        all_matches = []

        for category, weight in self.WEIGHTS.items():
            set_a = set(tags_a.get(category, []))
            set_b = set(tags_b.get(category, []))

            if not set_a and not set_b:
                continue

            intersection = set_a & set_b
            union = set_a | set_b

            jaccard = len(intersection) / len(union) if union else 0
            total_score += jaccard * weight
            total_weight += weight

            all_matches.extend(intersection)

        final_score = total_score / total_weight if total_weight else 0
        method = "rule"

        return final_score, method, list(set(all_matches))


class DetectLinksUseCase:
    def __init__(
        self,
        brief_repository: BriefRepoAsyncSQLite,
        link_repository: LinkRepoAsyncSQLite,
    ):
        self.brief_repository = brief_repository
        self.link_repository = link_repository
        self.tag_engine = TagExtractionEngine()
        self.link_engine = LinkDetectionEngine(self.tag_engine)

    async def execute(self) -> dict:
        briefs = await self.brief_repository.list(None)
        links = self.link_engine.detect_all(briefs)

        await self.link_repository.clear_all()
        for link in links:
            await self.link_repository.create_link(link)

        return {
            "total_links": len(links),
            "auto_links": len([l for l in links if l.link_type == LinkType.auto]),
            "suggested_links": len([l for l in links if l.link_type == LinkType.suggested]),
        }
