#!/usr/bin/env python3
"""
Quick validation script to check if the OpenAPI schema is valid
and can be generated without errors.
"""

import sys
import json

# Add the app directory to path
sys.path.insert(0, 'docker/apps/tinyolly-ui')

def validate_openapi():
    """Validate that FastAPI can generate OpenAPI schema"""
    try:
        # Import the app (this will fail if there are syntax errors)
        print("✓ Importing FastAPI app...")
        from tinyolly_ui import app
        
        # Try to generate OpenAPI schema
        print("✓ Generating OpenAPI schema...")
        schema = app.openapi()
        
        # Validate it's valid JSON
        print("✓ Validating JSON structure...")
        schema_json = json.dumps(schema, indent=2)
        
        # Check for key components
        print("✓ Checking required OpenAPI components...")
        assert schema.get('openapi'), "Missing OpenAPI version"
        assert schema.get('info'), "Missing info section"
        assert schema.get('paths'), "Missing paths"
        
        # Check info section
        info = schema['info']
        assert info.get('title') == 'TinyOlly', "Missing or incorrect title"
        assert info.get('version') == '2.0.0', "Missing or incorrect version"
        assert info.get('contact'), "Missing contact info"
        assert info.get('license'), "Missing license info"
        
        # Check tags
        assert schema.get('tags'), "Missing tags"
        tag_names = [tag['name'] for tag in schema['tags']]
        expected_tags = ['Ingestion', 'Traces', 'Spans', 'Logs', 'Metrics', 'Services', 'System']
        for tag in expected_tags:
            assert tag in tag_names, f"Missing tag: {tag}"
        
        # Check paths
        paths = schema['paths']
        assert '/v1/traces' in paths, "Missing ingestion endpoint"
        assert '/api/traces' in paths, "Missing traces query endpoint"
        assert '/api/logs' in paths, "Missing logs endpoint"
        assert '/api/metrics' in paths, "Missing metrics endpoint"
        assert '/api/service-map' in paths, "Missing service map endpoint"
        assert '/health' in paths, "Missing health endpoint"
        
        # Check schemas/components
        components = schema.get('components', {})
        schemas = components.get('schemas', {})
        assert 'ErrorResponse' in schemas, "Missing ErrorResponse model"
        assert 'HealthResponse' in schemas, "Missing HealthResponse model"
        assert 'IngestResponse' in schemas, "Missing IngestResponse model"
        assert 'TraceDetail' in schemas, "Missing TraceDetail model"
        assert 'MetricMetadata' in schemas, "Missing MetricMetadata model"
        
        # Count endpoints
        total_endpoints = sum(len(methods) for methods in paths.values())
        print(f"✓ Found {len(paths)} unique paths with {total_endpoints} total endpoints")
        print(f"✓ Found {len(schemas)} Pydantic models/schemas")
        print(f"✓ Found {len(tag_names)} API tags")
        
        # Check operation IDs
        operation_ids = []
        for path, methods in paths.items():
            for method, details in methods.items():
                if 'operationId' in details:
                    operation_ids.append(details['operationId'])
        
        print(f"✓ Found {len(operation_ids)} operation IDs")
        
        # Check for duplicates
        duplicates = [oid for oid in operation_ids if operation_ids.count(oid) > 1]
        if duplicates:
            print(f"⚠ Warning: Duplicate operation IDs: {set(duplicates)}")
        else:
            print("✓ All operation IDs are unique")
        
        print("\n" + "="*60)
        print("✅ OpenAPI validation successful!")
        print("="*60)
        print(f"\nKey Stats:")
        print(f"  - OpenAPI Version: {schema['openapi']}")
        print(f"  - API Title: {info['title']}")
        print(f"  - API Version: {info['version']}")
        print(f"  - Total Endpoints: {total_endpoints}")
        print(f"  - Total Models: {len(schemas)}")
        print(f"  - Total Tags: {len(tag_names)}")
        print(f"\nAccess documentation at:")
        print(f"  - Swagger UI: http://localhost:5005/docs")
        print(f"  - ReDoc: http://localhost:5005/redoc")
        print(f"  - OpenAPI JSON: http://localhost:5005/openapi.json")
        
        return True
        
    except ImportError as e:
        print(f"\n❌ Import Error: {e}")
        print("Note: This is expected if Redis dependencies are not installed.")
        print("The OpenAPI structure is still valid even if imports fail.")
        return False
    except Exception as e:
        print(f"\n❌ Validation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = validate_openapi()
    sys.exit(0 if success else 1)

