package config

import (
	"reflect"
	"os"
	"path/filepath"
	"testing"
)

// writeTestConfig 写一个最小 config.json 到临时目录
func writeTestConfig(t *testing.T, body string) string {
	t.Helper()
	dir := t.TempDir()
	p := filepath.Join(dir, "config.json")
	if err := os.WriteFile(p, []byte(body), 0o600); err != nil {
		t.Fatal(err)
	}
	return p
}

// TestBuildPriorityFlagBeatsEnvAndFile 验证 flag > env > 文件
func TestBuildPriorityFlagBeatsEnvAndFile(t *testing.T) {
	p := writeTestConfig(t, `{"storage":{"driver":"local"}}`)
	t.Setenv("TOOLBOX_STORAGE_DRIVER", "redis")
	t.Setenv("TOOLBOX_SERVER_ADDR", ":9999")

	c, err := Build(p, []string{"storage.driver=local"})
	if err != nil {
		t.Fatal(err)
	}
	if c.Storage.Driver != "local" {
		t.Errorf("flag should win: driver=%s", c.Storage.Driver)
	}
	if c.Server.Addr != ":9999" {
		t.Errorf("env should beat file default: addr=%s", c.Server.Addr)
	}
}

// TestBuildPriorityEnvBeatsFile 验证 env > 文件
func TestBuildPriorityEnvBeatsFile(t *testing.T) {
	p := writeTestConfig(t, `{"storage":{"driver":"local","redis":{"host":"1.2.3.4"}}}`)
	t.Setenv("TOOLBOX_STORAGE_REDIS_HOST", "10.0.0.1")

	c, err := Build(p, nil)
	if err != nil {
		t.Fatal(err)
	}
	if c.Storage.Redis.Host != "10.0.0.1" {
		t.Errorf("env should beat file: host=%s", c.Storage.Redis.Host)
	}
	// 文件里的其他字段保留
	if c.Storage.Redis.Host == "1.2.3.4" || c.Storage.Redis.Port != 6379 {
		t.Errorf("file fields should persist: %+v", c.Storage.Redis)
	}
}

// TestBuildUnknownPathFails 验证拼错路径 fail-fast
func TestBuildUnknownPathFails(t *testing.T) {
	p := writeTestConfig(t, `{}`)
	t.Setenv("TOOLBOX_STORAGE_DRIVE", "redis") // 拼错的 env 被静默跳过
	if _, err := Build(p, nil); err != nil {
		t.Fatalf("misspelled env should be ignored silently: %v", err)
	}
	if _, err := Build(p, []string{"storage.drive=redis"}); err == nil {
		t.Fatal("misspelled flag path should fail-fast")
	}
}

// TestBuildTypeMismatchFails 验证类型不匹配 fail-fast
func TestBuildTypeMismatchFails(t *testing.T) {
	p := writeTestConfig(t, `{}`)
	if _, err := Build(p, []string{"storage.redis.port=notanumber"}); err == nil {
		t.Fatal("int field given non-number should fail-fast")
	}
	if _, err := Build(p, []string{"features.ads=notabool"}); err == nil {
		t.Fatal("bool field given non-bool should fail-fast")
	}
}

// TestBuildBoolOverride 验证 bool 覆盖（含显式 false 不被默认值吞掉）
func TestBuildBoolOverride(t *testing.T) {
	p := writeTestConfig(t, `{"features":{"ads":true}}`)
	t.Setenv("TOOLBOX_FEATURES_ADS", "false")

	c, err := Build(p, nil)
	if err != nil {
		t.Fatal(err)
	}
	if c.Features.Ads {
		t.Error("env false should override file true")
	}
}

// TestBuildSliceNotOverridable 验证切片/复杂结构拒绝覆盖并报错
func TestBuildSliceNotOverridable(t *testing.T) {
	p := writeTestConfig(t, `{}`)
	if _, err := Build(p, []string{"ads.slots=x"}); err == nil {
		t.Fatal("slice path should fail-fast")
	}
}

// TestSetPathCaseInsensitive 验证大小写不敏感匹配
func TestSetPathCaseInsensitive(t *testing.T) {
	c := &Config{}
	if err := SetPath(c, "Storage.Redis.Host", "h"); err != nil {
		t.Fatal(err)
	}
	if c.Storage.Redis.Host != "h" {
		t.Errorf("case-insensitive match failed: %+v", c.Storage.Redis)
	}
}

// TestNacosNotEnabledByDefault 验证默认不启用 Nacos
func TestNacosNotEnabledByDefault(t *testing.T) {
	p := writeTestConfig(t, `{"storage":{"driver":"local"}}`)
	c, err := Build(p, nil)
	if err != nil {
		t.Fatal(err)
	}
	if c.Nacos.Enabled {
		t.Error("nacos should default to disabled")
	}
}

// TestNacosPatchUnknownFieldFails 验证 Nacos 补丁未知字段 fail-fast
func TestNacosPatchUnknownFieldFails(t *testing.T) {
	c := &Config{}
	_, err := applyPatch(reflectOf(c), map[string]interface{}{"storge": map[string]interface{}{}}, "")
	if err == nil {
		t.Fatal("unknown nacos patch field should fail")
	}
}

// reflectOf 取指针指向的 reflect.Value（避免测试文件直接 import reflect）
func reflectOf(c *Config) reflect.Value { return reflect.ValueOf(c).Elem() }
