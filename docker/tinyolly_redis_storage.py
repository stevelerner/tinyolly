"""
TinyOlly Storage Module
Handles all Redis interactions for traces, logs, and metrics.
"""
import zlib
import base64

# ... (imports)

class Storage:
    # ... (init)

    def _compress_if_needed(self, data_str):
        """Compress data if larger than 1KB"""
        if len(data_str) > 1024:
            compressed = zlib.compress(data_str.encode('utf-8'))
            # Prefix with marker to identify compressed data
            return b'ZLIB:' + compressed
        return data_str

    def _decompress_if_needed(self, data):
        """Decompress data if it has the ZLIB marker"""
        if isinstance(data, bytes) and data.startswith(b'ZLIB:'):
            return zlib.decompress(data[5:]).decode('utf-8')
        # Redis client with decode_responses=True returns strings, but we might get bytes if we bypass it
        # However, for our usage with setex/get, we need to handle the string representation of bytes if redis decodes it
        # Actually, if we store bytes, redis-py with decode_responses=True might try to decode it as utf-8 and fail
        # So we should probably base64 encode compressed data if we want to stick to strings
        # OR we just store as bytes and handle decoding manually.
        # Given the existing code uses decode_responses=True, let's use base64 for safety.
        if isinstance(data, str) and data.startswith('ZLIB_B64:'):
            try:
                compressed = base64.b64decode(data[9:])
                return zlib.decompress(compressed).decode('utf-8')
            except Exception as e:
                print(f"Decompression error: {e}")
                return "{}"
        return data

    def _compress_for_storage(self, data_str):
        """Compress and base64 encode if larger than 1KB"""
        if len(data_str) > 1024:
            compressed = zlib.compress(data_str.encode('utf-8'))
            return 'ZLIB_B64:' + base64.b64encode(compressed).decode('utf-8')
        return data_str

    # ============================================
    # Trace Storage
    # ============================================

    def store_span(self, span):
        """Store a span and index it"""
        try:
            # ... (trace_id/span_id extraction)
            trace_id = span.get('traceId') or span.get('trace_id')
            span_id = span.get('spanId') or span.get('span_id')
            
            if not trace_id or not span_id:
                return
            
            # Duplicate Span Detection
            trace_key = f"trace:{trace_id}"
            if self.client.sismember(trace_key, span_id):
                return

            # Use pipeline for batch writes
            pipe = self.client.pipeline()
            
            # Store individual span (compressed)
            span_key = f"span:{span_id}"
            span_json = json.dumps(span)
            pipe.setex(span_key, self.ttl, self._compress_for_storage(span_json))
            
            # ... (indexing logic remains same)
            pipe.sadd(trace_key, span_id)
            pipe.expire(trace_key, self.ttl)
            
            pipe.zadd('trace_index', {trace_id: time.time()})
            pipe.expire('trace_index', self.ttl)
            
            # Add to trace's list of spans (compressed)
            trace_span_key = f"trace:{trace_id}:spans"
            pipe.rpush(trace_span_key, self._compress_for_storage(span_json))
            pipe.expire(trace_span_key, self.ttl)
            
            pipe.zadd('span_index', {span_id: time.time()})
            pipe.expire('span_index', self.ttl)
            
            pipe.execute()
        except redis.RedisError as e:
            print(f"Redis error in store_span: {e}")

    # ... (get_recent_traces, get_recent_spans)

    def get_span_details(self, span_id):
        """Get details for a specific span"""
        span_key = f"span:{span_id}"
        try:
            span_data = self.client.get(span_key)
            
            if not span_data:
                return None
                
            span_json = self._decompress_if_needed(span_data)
            span = json.loads(span_json)
            
            # ... (rest of get_span_details)
            # Extract attributes for display
            def get_attr(obj, keys):
                # Handle OTLP list of dicts format
                if isinstance(obj.get('attributes'), list):
                    for attr in obj['attributes']:
                        if attr['key'] in keys:
                            val = attr['value']
                            # Return the first non-null value found
                            for k in ['stringValue', 'intValue', 'boolValue', 'doubleValue']:
                                if k in val:
                                    return val[k]
                # Handle dict format (if normalized)
                elif isinstance(obj.get('attributes'), dict):
                    for k in keys:
                        if k in obj['attributes']:
                            return obj['attributes'][k]
                return None

            method = get_attr(span, ['http.method', 'http.request.method'])
            route = get_attr(span, ['http.route', 'http.target', 'url.path'])
            status_code = get_attr(span, ['http.status_code', 'http.response.status_code'])
            server_name = get_attr(span, ['http.server_name', 'net.host.name'])
            scheme = get_attr(span, ['http.scheme', 'url.scheme'])
            host = get_attr(span, ['http.host', 'net.host.name'])
            target = get_attr(span, ['http.target', 'url.path'])
            url = get_attr(span, ['http.url', 'url.full'])
            
            start_time = int(span.get('startTimeUnixNano', span.get('start_time', 0)))
            end_time = int(span.get('endTimeUnixNano', span.get('end_time', 0)))
            duration_ns = end_time - start_time if end_time > start_time else 0

            return {
                'span_id': span_id,
                'trace_id': span.get('traceId') or span.get('trace_id'),
                'name': span.get('name', 'unknown'),
                'start_time': start_time,
                'duration_ms': duration_ns / 1_000_000,
                'method': method,
                'route': route,
                'status_code': status_code,
                'status': span.get('status', {}),
                'server_name': server_name,
                'scheme': scheme,
                'host': host,
                'target': target,
                'url': url,
                'service_name': span.get('serviceName', 'unknown')
            }
        except Exception as e:
            print(f"Error getting span details: {e}")
            return None

    def get_trace_spans(self, trace_id):
        """Get all spans for a trace"""
        trace_key = f"trace:{trace_id}:spans"
        try:
            span_data_list = self.client.lrange(trace_key, 0, -1)
            
            if not span_data_list:
                return []
                
            return [json.loads(self._decompress_if_needed(s)) for s in span_data_list]
        except Exception as e:
            print(f"Error getting trace spans: {e}")
            return []

    # ... (get_trace_summary)

    # ============================================
    # Log Storage
    # ============================================

    def store_log(self, log):
        """Store a log entry"""
        try:
            # ... (log_id/timestamp logic)
            if 'log_id' not in log:
                log['log_id'] = str(uuid.uuid4())
                
            log_id = log['log_id']
            timestamp = log.get('timestamp', time.time())
            log['timestamp'] = timestamp
            
            pipe = self.client.pipeline()
            
            # Store log content (compressed)
            log_key = f"log:{log_id}"
            log_json = json.dumps(log)
            pipe.setex(log_key, self.ttl, self._compress_for_storage(log_json))
            
            # ... (indexing logic)
            pipe.zadd('log_index', {log_id: timestamp})
            pipe.expire('log_index', self.ttl)
            
            trace_id = log.get('trace_id') or log.get('traceId')
            if trace_id:
                trace_log_key = f"trace:{trace_id}:logs"
                pipe.rpush(trace_log_key, log_id)
                pipe.expire(trace_log_key, self.ttl)
                
            pipe.execute()
        except redis.RedisError as e:
            print(f"Redis error in store_log: {e}")

    def get_logs(self, trace_id=None, limit=100):
        """Get logs, optionally filtered by trace_id"""
        try:
            if trace_id:
                trace_log_key = f"trace:{trace_id}:logs"
                log_ids = self.client.lrange(trace_log_key, 0, limit - 1)
            else:
                log_ids = self.client.zrevrange('log_index', 0, limit - 1)
                
            logs = []
            for log_id in log_ids:
                log_data = self.client.get(f"log:{log_id}")
                if log_data:
                    logs.append(json.loads(self._decompress_if_needed(log_data)))
            
            return logs
        except Exception as e:
            print(f"Error getting logs: {e}")
            return []

    # ============================================
    # Metric Storage
    # ============================================

    def store_metric(self, metric):
        """Store a metric with cardinality protection"""
        try:
            name = metric.get('name')
            timestamp = metric.get('timestamp', time.time())
            
            if not name:
                return
            
            # Check cardinality limit before adding new metric
            current_count = self.client.scard('metric_names')
            is_existing = self.client.sismember('metric_names', name)
            
            if not is_existing and current_count >= self.max_cardinality:
                # Drop this metric to prevent cardinality explosion
                # Log to a separate key for monitoring
                pipe = self.client.pipeline()
                pipe.incr('metric_dropped_count')
                pipe.expire('metric_dropped_count', self.ttl)
                pipe.sadd('metric_dropped_names', name)
                pipe.expire('metric_dropped_names', 3600)  # Keep for 1 hour for debugging
                pipe.execute()
                return
                
            # Store in time-series sorted set
            metric_key = f"metric:{name}"
            
            # We store the whole metric object as the member
            # In a real system, this would be more optimized
            metric_data = json.dumps(metric)
            
            pipe = self.client.pipeline()
            pipe.zadd(metric_key, {metric_data: timestamp})
            pipe.expire(metric_key, self.ttl)
            
            # Add to metric names index
            pipe.sadd('metric_names', name)
            pipe.expire('metric_names', self.ttl)
            
            pipe.execute()
        except redis.RedisError as e:
            print(f"Redis error in store_metric: {e}")

    def get_metric_names(self, limit=None):
        """Get metric names, optionally limited and sorted"""
        names = list(self.client.smembers('metric_names'))
        names.sort()  # Alphabetical sorting
        
        if limit and limit > 0:
            return names[:limit]
        return names
    
    def get_cardinality_stats(self):
        """Get metric cardinality statistics"""
        return {
            'current': self.client.scard('metric_names'),
            'max': self.max_cardinality,
            'dropped_count': int(self.client.get('metric_dropped_count') or 0),
            'dropped_names': list(self.client.smembers('metric_dropped_names'))
        }

    def get_metric_data(self, name, start_time, end_time):
        """Get metric data points for a time range"""
        metric_key = f"metric:{name}"
        data = self.client.zrangebyscore(metric_key, start_time, end_time)
        return [json.loads(d) for d in data]

    # ============================================
    # Service Map
    # ============================================

    def get_service_graph(self, limit=50):
        """Build service dependency graph from recent traces"""
        # Check cache first
        cache_key = f"service_graph_cache:{limit}"
        cached_graph = self.client.get(cache_key)
        if cached_graph:
            return json.loads(cached_graph)

        trace_ids = self.get_recent_traces(limit)
        
        nodes = set()
        edges = {}  # (source, target) -> count
        
        for trace_id in trace_ids:
            spans = self.get_trace_spans(trace_id)
            if not spans:
                continue
                
            # Map span_id to span for easy lookup
            span_map = {s.get('spanId', s.get('span_id')): s for s in spans}
            
            for span in spans:
                service = span.get('serviceName', 'unknown')
                nodes.add(service)
                
                parent_id = span.get('parentSpanId', span.get('parent_span_id'))
                if parent_id and parent_id in span_map:
                    parent = span_map[parent_id]
                    parent_service = parent.get('serviceName', 'unknown')
                    
                    if parent_service != service and parent_service != 'unknown' and service != 'unknown':
                        key = (parent_service, service)
                        edges[key] = edges.get(key, 0) + 1
                        
        # Format for frontend
        graph_nodes = [{'id': name, 'label': name} for name in nodes]
        graph_edges = [{'source': s, 'target': t, 'value': c} for (s, t), c in edges.items()]
        
        result = {
            'nodes': graph_nodes,
            'edges': graph_edges
        }
        
        # Cache the result for 10 seconds
        self.client.setex(cache_key, 10, json.dumps(result))
        
        return result

    # ============================================
    # Stats
    # ============================================

    def get_stats(self):
        """Get overall stats including cardinality"""
        cardinality = self.get_cardinality_stats()
        return {
            'traces': self.client.zcard('trace_index'),
            'spans': self.client.zcard('span_index'),
            'logs': self.client.zcard('log_index'),
            'metrics': cardinality['current'],
            'metrics_max': cardinality['max'],
            'metrics_dropped': cardinality['dropped_count']
        }
