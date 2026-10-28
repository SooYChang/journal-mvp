package com.institutionweb.mvp.user;

import java.sql.ResultSet;
import java.sql.Types;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public UserRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<UserRecord> findById(long id) {
        List<UserRecord> rows = jdbc.query(
                "SELECT * FROM users WHERE id = :id",
                new MapSqlParameterSource("id", id),
                (rs, rowNum) -> map(rs));
        return rows.stream().findFirst();
    }

    public Optional<UserRecord> findByEmailIgnoreCase(String email) {
        List<UserRecord> rows = jdbc.query(
                """
                SELECT * FROM users
                WHERE LOWER(email) = LOWER(:email)
                ORDER BY CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END, id DESC
                """,
                new MapSqlParameterSource("email", email),
                (rs, rowNum) -> map(rs));
        return rows.stream().findFirst();
    }

    public boolean existsByEmailIgnoreCase(String email) {
        Integer count = jdbc.queryForObject(
                """
                SELECT COUNT(*) FROM users
                WHERE LOWER(email) = LOWER(:email) AND deleted_at IS NULL
                """,
                new MapSqlParameterSource("email", email),
                Integer.class);
        return count != null && count > 0;
    }

    public long countActiveAdmins() {
        Integer count = jdbc.queryForObject(
                """
                SELECT COUNT(*) FROM users
                WHERE role = 'SOCIETY_ADMIN' AND status = 'ACTIVE' AND deleted_at IS NULL
                """,
                new MapSqlParameterSource(),
                Integer.class);
        return count == null ? 0 : count;
    }

    public UserRecord insert(
            String email,
            String displayName,
            String affiliation,
            String passwordHash,
            String role,
            String status,
            Instant now) {
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(
                """
                INSERT INTO users (
                    email, display_name, affiliation, password_hash, role, status, created_at, updated_at, deleted_at
                ) VALUES (
                    :email, :displayName, :affiliation, :passwordHash, :role, :status, :now, :now, NULL
                )
                """,
                new MapSqlParameterSource()
                        .addValue("email", email)
                        .addValue("displayName", displayName)
                        .addValue("affiliation", affiliation, Types.VARCHAR)
                        .addValue("passwordHash", passwordHash)
                        .addValue("role", role)
                        .addValue("status", status)
                        .addValue("now", Timestamp.from(now)),
                keys,
                new String[] {"id"});
        Number id = keys.getKey();
        return findById(id.longValue()).orElseThrow();
    }

    public UserRecord update(long id, String displayName, String role, String status, Instant now) {
        jdbc.update(
                """
                UPDATE users
                SET display_name = :displayName, role = :role, status = :status, updated_at = :now
                WHERE id = :id AND deleted_at IS NULL
                """,
                new MapSqlParameterSource()
                        .addValue("id", id)
                        .addValue("displayName", displayName)
                        .addValue("role", role)
                        .addValue("status", status)
                        .addValue("now", Timestamp.from(now)));
        return findById(id).orElseThrow();
    }

    public void softDelete(long id, Instant now) {
        jdbc.update(
                """
                UPDATE users
                SET deleted_at = :now, status = 'DEACTIVATED', updated_at = :now
                WHERE id = :id AND deleted_at IS NULL
                """,
                new MapSqlParameterSource().addValue("id", id).addValue("now", Timestamp.from(now)));
    }

    public long countMembers(String query, String status) {
        MapSqlParameterSource params = memberFilter(query, status);
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL" + memberWhere(query, status),
                params,
                Integer.class);
        return count == null ? 0 : count;
    }

    public List<UserRecord> listMembers(String query, String status, int page, int size) {
        MapSqlParameterSource params = memberFilter(query, status)
                .addValue("limit", size)
                .addValue("offset", (long) page * size);
        return jdbc.query(
                """
                SELECT * FROM users
                WHERE deleted_at IS NULL
                """
                        + memberWhere(query, status)
                        + """
                 ORDER BY created_at DESC, id DESC
                 LIMIT :limit OFFSET :offset
                """,
                params,
                (rs, rowNum) -> map(rs));
    }

    private MapSqlParameterSource memberFilter(String query, String status) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        if (query != null && !query.isBlank()) {
            params.addValue("query", "%" + query.trim().toLowerCase() + "%");
        }
        if (status != null && !status.isBlank()) {
            params.addValue("status", status);
        }
        return params;
    }

    private String memberWhere(String query, String status) {
        StringBuilder sql = new StringBuilder();
        if (query != null && !query.isBlank()) {
            sql.append(" AND (LOWER(email) LIKE :query OR LOWER(display_name) LIKE :query OR LOWER(affiliation) LIKE :query)");
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND status = :status");
        }
        return sql.toString();
    }

    private UserRecord map(ResultSet rs) throws SQLException {
        return new UserRecord(
                rs.getLong("id"),
                rs.getString("email"),
                rs.getString("display_name"),
                rs.getString("affiliation"),
                rs.getString("password_hash"),
                rs.getString("role"),
                rs.getString("status"),
                instant(rs, "created_at"),
                instant(rs, "updated_at"),
                instant(rs, "deleted_at"));
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }
}
