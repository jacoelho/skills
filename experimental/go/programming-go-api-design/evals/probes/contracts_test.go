package probes_test

import (
	"encoding/json"
	"go/ast"
	"go/parser"
	"go/token"
	"go/types"
	"strings"
	"testing"
)

// This probe demonstrates two different valid API contracts. A decoder's one-value
// operation is not inherently defective; using it to prove whole-input validity is.
func TestOneValueIsNotWholeInput(t *testing.T) {
	input := `{"name":"ok"} {"extra":true}`
	var got struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(strings.NewReader(input)).Decode(&got); err != nil {
		t.Fatalf("one-value decode: %v", err)
	}
	if got.Name != "ok" {
		t.Fatalf("got name %q, want ok", got.Name)
	}
	if err := json.Unmarshal([]byte(input), &got); err == nil {
		t.Fatal("whole-input unmarshal unexpectedly accepted a second value")
	}
}

type record struct {
	Name string `json:"name"`
}

type customRecord struct {
	Record record
}

// This hook deliberately starts another operation with its default policy.
func (r *customRecord) UnmarshalJSON(data []byte) error {
	return json.Unmarshal(data, &r.Record)
}

func TestStrictnessAtCustomUnmarshalBoundary(t *testing.T) {
	input := `{"child":{"name":"ok","unexpected":true}}`
	var plain struct {
		Child record `json:"child"`
	}
	dec := json.NewDecoder(strings.NewReader(input))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&plain); err == nil {
		t.Fatal("plain child unexpectedly accepted an unknown field")
	}

	var custom struct {
		Child customRecord `json:"child"`
	}
	dec = json.NewDecoder(strings.NewReader(input))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&custom); err != nil {
		t.Fatalf("custom handler using defaults: %v", err)
	}
	if custom.Child.Record.Name != "ok" {
		t.Fatalf("custom child name = %q", custom.Child.Record.Name)
	}
}

func checkFunctionType(src string) error {
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, "api.go", src, parser.AllErrors)
	if err != nil {
		return err
	}
	conf := types.Config{}
	_, err = conf.Check("example.com/compat", fset, []*ast.File{f}, nil)
	return err
}

func TestAddingVariadicArgumentChangesFunctionType(t *testing.T) {
	oldAPI := `package compat
        func Run(name string) {}
        var runner func(string) = Run
    `
	directCallOnly := `package compat
        type Option struct{}
        func Run(name string, opts ...Option) {}
        func caller() { Run("job") }
    `
	changedAPI := `package compat
        type Option struct{}
        func Run(name string, opts ...Option) {}
        var runner func(string) = Run
    `
	if err := checkFunctionType(oldAPI); err != nil {
		t.Fatalf("old API fixture: %v", err)
	}
	if err := checkFunctionType(directCallOnly); err != nil {
		t.Fatalf("unchanged direct call: %v", err)
	}
	if err := checkFunctionType(changedAPI); err == nil {
		t.Fatal("changed function unexpectedly assignable to the old function type")
	}
}
