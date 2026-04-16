import pytest
from mission_control.domain.models import Brief
from mission_control.domain.enums import Status, LinkType
from mission_control.usecases.detect_links import TagExtractionEngine, LinkDetectionEngine


class TestTagExtractionEngine:
    def setup_method(self):
        self.engine = TagExtractionEngine()

    def test_extract_technologies_redis(self):
        brief = Brief(
            id="test-1",
            folder_path="Sprint 1/Task 1",
            title="Redis Cache Implementation",
            goal="Implement Redis caching",
            technical_details="Use redis-py client",
            status=Status.drafting,
        )
        tags = self.engine.extract(brief)
        assert "redis" in tags["technologies"]

    def test_extract_technologies_kafka(self):
        brief = Brief(
            id="test-2",
            folder_path="Sprint 1/Task 2",
            title="Kafka Integration",
            goal="Add Kafka messaging",
            technical_details="Use confluent-kafka",
            status=Status.drafting,
        )
        tags = self.engine.extract(brief)
        assert "kafka" in tags["technologies"]

    def test_extract_technologies_postgres(self):
        brief = Brief(
            id="test-3",
            folder_path="Sprint 1/Task 3",
            title="Database Migration",
            goal="Migrate to PostgreSQL",
            technical_details="Use PostgreSQL 15",
            status=Status.drafting,
        )
        tags = self.engine.extract(brief)
        assert "postgres" in tags["technologies"]

    def test_extract_technologies_spring(self):
        brief = Brief(
            id="test-4",
            folder_path="Sprint 1/Task 4",
            title="Spring Boot API",
            goal="Create REST API",
            technical_details="Use SpringBoot 3.0",
            status=Status.drafting,
        )
        tags = self.engine.extract(brief)
        assert "spring" in tags["technologies"]

    def test_extract_patterns_caching(self):
        brief = Brief(
            id="test-5",
            folder_path="Sprint 1/Task 5",
            title="Cache Layer",
            goal="Implement caching",
            technical_details="Use LRU cache with TTL",
            status=Status.drafting,
        )
        tags = self.engine.extract(brief)
        assert "caching" in tags["patterns"]

    def test_extract_patterns_feature_flag(self):
        brief = Brief(
            id="test-6",
            folder_path="Sprint 1/Task 6",
            title="Feature Flags",
            goal="Add feature flag support",
            technical_details="Use LaunchDarkly SDK",
            status=Status.drafting,
        )
        tags = self.engine.extract(brief)
        assert "feature-flag" in tags["patterns"]

    def test_extract_patterns_circuit_breaker(self):
        brief = Brief(
            id="test-7",
            folder_path="Sprint 1/Task 7",
            title="Resilience",
            goal="Add circuit breaker",
            technical_details="Use resilience4j",
            status=Status.drafting,
        )
        tags = self.engine.extract(brief)
        assert "circuit-breaker" in tags["patterns"]

    def test_extract_services(self):
        brief = Brief(
            id="test-8",
            folder_path="Sprint 1/Backend",
            title="Backend API",
            goal="Create API",
            folder_name="Backend",
            status=Status.drafting,
        )
        tags = self.engine.extract(brief)
        assert "backend" in tags["services"]

    def test_extract_constraints(self):
        brief = Brief(
            id="test-9",
            folder_path="Sprint 1/Task 9",
            title="Task",
            goal="Do something",
            constraints=["No breaking changes", "Must be backward compatible"],
            status=Status.drafting,
        )
        tags = self.engine.extract(brief)
        assert "no breaking changes" in tags["constraints"]
        assert "must be backward compatible" in tags["constraints"]

    def test_extract_conventions_api_design(self):
        brief = Brief(
            id="test-10",
            folder_path="Sprint 1/Task 10",
            title="API Design",
            goal="Design REST API",
            technical_details="Use REST conventions",
            status=Status.drafting,
        )
        tags = self.engine.extract(brief)
        assert "api-design" in tags["conventions"]

    def test_extract_conventions_database(self):
        brief = Brief(
            id="test-11",
            folder_path="Sprint 1/Task 11",
            title="DB Schema",
            goal="Design database",
            technical_details="Use normalized DB design",
            status=Status.drafting,
        )
        tags = self.engine.extract(brief)
        assert "database" in tags["conventions"]

    def test_extract_all_empty_brief(self):
        brief = Brief(
            id="test-12",
            folder_path="Sprint 1/Task 12",
            title="Empty Task",
            status=Status.drafting,
        )
        tags = self.engine.extract(brief)
        assert "technologies" in tags
        assert "patterns" in tags
        assert "services" in tags
        assert "conventions" in tags
        assert "constraints" in tags


class TestLinkDetectionEngine:
    def setup_method(self):
        self.tag_engine = TagExtractionEngine()
        self.link_engine = LinkDetectionEngine(self.tag_engine)

    def test_detect_all_no_briefs(self):
        links = self.link_engine.detect_all([])
        assert links == []

    def test_detect_all_single_brief(self):
        brief = Brief(
            id="test-1",
            folder_path="Sprint 1/Task 1",
            title="Task 1",
            status=Status.drafting,
        )
        links = self.link_engine.detect_all([brief])
        assert links == []

    def test_detect_all_similar_briefs(self):
        brief1 = Brief(
            id="test-1",
            folder_path="Sprint 1/Task 1",
            title="Redis Cache Implementation",
            goal="Implement Redis caching for the API",
            technical_details="Use redis-py with LRU cache",
            constraints=["No breaking changes"],
            status=Status.drafting,
        )
        brief2 = Brief(
            id="test-2",
            folder_path="Sprint 1/Task 2",
            title="Redis Session Store",
            goal="Use Redis for session management with caching",
            technical_details="Use redis-py for sessions with TTL",
            constraints=["Must be fast"],
            status=Status.drafting,
        )
        links = self.link_engine.detect_all([brief1, brief2])
        assert len(links) == 1
        assert links[0].source_path == "Sprint 1/Task 1"
        assert links[0].target_path == "Sprint 1/Task 2"
        assert links[0].score > 0.3

    def test_detect_all_different_briefs(self):
        brief1 = Brief(
            id="test-1",
            folder_path="Sprint 1/Task 1",
            title="Redis Cache",
            goal="Implement Redis caching",
            status=Status.drafting,
        )
        brief2 = Brief(
            id="test-2",
            folder_path="Sprint 1/Task 2",
            title="PostgreSQL DB",
            goal="Implement database",
            status=Status.drafting,
        )
        links = self.link_engine.detect_all([brief1, brief2])
        # Different topics, score should be low
        auto_links = [l for l in links if l.link_type.value == "auto"]
        assert len(auto_links) == 0

    def test_calculate_similarity_identical(self):
        tags_a = {
            "technologies": ["redis"],
            "patterns": ["caching"],
            "services": ["api"],
            "conventions": ["api-design"],
            "constraints": ["fast"],
        }
        tags_b = {
            "technologies": ["redis"],
            "patterns": ["caching"],
            "services": ["api"],
            "conventions": ["api-design"],
            "constraints": ["fast"],
        }
        score, method, matched = self.link_engine._calculate_similarity(tags_a, tags_b)
        assert score == 1.0
        assert method == "rule"
        assert "redis" in matched

    def test_calculate_similarity_partial(self):
        tags_a = {
            "technologies": ["redis", "kafka"],
            "patterns": [],
            "services": [],
            "conventions": [],
            "constraints": [],
        }
        tags_b = {
            "technologies": ["redis"],
            "patterns": [],
            "services": [],
            "conventions": [],
            "constraints": [],
        }
        score, method, matched = self.link_engine._calculate_similarity(tags_a, tags_b)
        assert 0 < score < 1.0
        assert "redis" in matched

    def test_calculate_similarity_empty(self):
        tags_a = {
            "technologies": [],
            "patterns": [],
            "services": [],
            "conventions": [],
            "constraints": [],
        }
        tags_b = {
            "technologies": [],
            "patterns": [],
            "services": [],
            "conventions": [],
            "constraints": [],
        }
        score, method, matched = self.link_engine._calculate_similarity(tags_a, tags_b)
        assert score == 0.0

    def test_link_type_threshold_auto(self):
        brief1 = Brief(
            id="test-1",
            folder_path="A",
            title="Redis Cache with Kafka",
            goal="Use redis caching and kafka messaging for API",
            technical_details="Implement LRU cache using redis-py, use kafka for events",
            constraints=["fast", "reliable", "scalable"],
            status=Status.drafting,
        )
        brief2 = Brief(
            id="test-2",
            folder_path="B",
            title="Redis Sessions with Kafka",
            goal="Use redis sessions and kafka for caching",
            technical_details="Implement session store with redis-py, use kafka for cache invalidation",
            constraints=["fast", "reliable", "scalable"],
            status=Status.drafting,
        )
        links = self.link_engine.detect_all([brief1, brief2])
        # High similarity should result in auto link
        assert len(links) == 1
        assert links[0].link_type == LinkType.auto
