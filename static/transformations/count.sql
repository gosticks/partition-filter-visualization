	ALTER TABLE "${tableName}" ADD COLUMN family TEXT;
	ALTER TABLE "${tableName}" ADD COLUMN mode TEXT;
	ALTER TABLE "${tableName}" ADD COLUMN vectorization TEXT;
	ALTER TABLE "${tableName}" ADD COLUMN fixture TEXT;
	ALTER TABLE "${tableName}" ADD COLUMN s FLOAT;
	ALTER TABLE "${tableName}" ADD COLUMN n_threads INTEGER;
	ALTER TABLE "${tableName}" ADD COLUMN n_partitions INTEGER;
	ALTER TABLE "${tableName}" ADD COLUMN n_elements_build INTEGER;
	ALTER TABLE "${tableName}" ADD COLUMN n_elements_lookup INTEGER;
	ALTER TABLE "${tableName}" ADD COLUMN shared_elements FLOAT;
	ALTER TABLE "${tableName}" ADD COLUMN construction_throughput FLOAT;
	ALTER TABLE "${tableName}" ADD COLUMN lookup_throughput FLOAT;

	WITH SplitValues AS (
		SELECT
		name,
		SPLIT_PART(name, '_', 1) AS family,
		SPLIT_PART(name, '_', 2) AS mode,
		SPLIT_PART(name, '_', 4) AS vectorization,
		SPLIT_PART(name, '/', 2) AS fixture,
		CAST(SPLIT_PART(name, '/', 3) AS FLOAT) / 100 AS s,
		CAST(SPLIT_PART(name, '/', 4) AS INTEGER) AS n_threads,
		CAST(SPLIT_PART(name, '/', 5) AS INTEGER) AS n_partitions,
		CAST(SPLIT_PART(name, '/', 6) AS INTEGER) AS n_elements_build,
		CAST(SPLIT_PART(name, '/', 7) AS INTEGER) AS n_elements_lookup,
		CAST(SPLIT_PART(name, '/', 8) AS FLOAT) / 100 AS shared_elements
		FROM "${tableName}")
	UPDATE "${tableName}" AS t
		SET
			family = sv.family,
			mode = sv.mode,
			vectorization = sv.vectorization,
			fixture = sv.fixture,
			s = sv.s,
			n_threads = sv.n_threads,
			n_partitions = sv.n_partitions,
			n_elements_build = sv.n_elements_build,
			n_elements_lookup = sv.n_elements_lookup,
	shared_elements = sv.shared_elements
	FROM SplitValues AS sv
	WHERE t.name = sv.name;

	UPDATE "${tableName}"
	SET "construction_throughput" = (n_elements_build * 1000.0) / real_time
	WHERE real_time IS NOT NULL AND real_time != 0;

	UPDATE "${tableName}" as t
		SET fpr = 'NaN'
		WHERE fpr = -1;
