# 🔍 YAML Validation & Indentation Guide

## Issue Fixed ✅

**Error**: `MalformedYAMLError: yaml: line 27: did not find expected key`

**Root Cause**: Incorrect indentation in `backend-deployment.yaml`

**Problem Code**:
```yaml
         resources:        # 9 spaces (wrong)
          livenessProbe:   # 10 spaces (wrong)
```

**Fixed Code**:
```yaml
        resources:         # 8 spaces (correct)
        livenessProbe:     # 8 spaces (correct)
```

---

## YAML Indentation Rules

### Container Properties Must Align

In Kubernetes YAML, all properties of a container must be indented at the **same level**:

```yaml
containers:
- name: pulsedesk-backend           # List item (2 spaces)
  image: myimage:latest             # 2 spaces
  ports:                            # 2 spaces
  - containerPort: 5000             # 2 spaces (list)
  env:                              # 2 spaces
  - name: ENV_VAR                   # 2 spaces (list)
    value: "value"
  resources:                        # 2 spaces ✅ ALIGNED
    requests:
      cpu: 250m
      memory: 512Mi
  livenessProbe:                    # 2 spaces ✅ ALIGNED
    httpGet:
      path: /health
      port: 5000
  readinessProbe:                   # 2 spaces ✅ ALIGNED
    httpGet:
      path: /health
      port: 5000
```

### ❌ Common Mistakes

```yaml
# WRONG: Inconsistent indentation
- name: backend
  image: myimage
  resources:                # 2 spaces
    requests:
      cpu: 250m
   livenessProbe:          # 1 space (WRONG!)
     httpGet:
       path: /health
```

```yaml
# WRONG: Too much indentation
- name: backend
  image: myimage
      resources:           # 4 spaces (WRONG!)
        requests:
          cpu: 250m
      livenessProbe:       # 4 spaces (WRONG!)
        httpGet:
          path: /health
```

---

## How to Validate YAML

### Method 1: Online Tools
- https://www.yamllint.com/
- https://codebeautify.org/yaml-validator
- Paste your YAML to validate instantly

### Method 2: Command Line

**Using yamllint**:
```bash
# Install
brew install yamllint   # macOS
sudo apt install yamllint  # Ubuntu

# Validate file
yamllint kubernetes/backend-deployment.yaml
```

**Using kubectl**:
```bash
# Dry-run to validate
kubectl apply -f kubernetes/backend-deployment.yaml --dry-run=client

# Detailed validation
kubectl apply -f kubernetes/backend-deployment.yaml --dry-run=client -o yaml
```

**Using python**:
```bash
python -m yaml <file>
```

### Method 3: IDE Tools

**VS Code**:
- Install "YAML" extension by Red Hat
- Auto-validates on save
- Shows indentation errors in real-time

**Vim**:
```vim
:set listchars=tab:>-,trail:~
:set list
```

---

## Common YAML Indentation Levels

### Standard Kubernetes Manifest

```
apiVersion: apps/v1              # 0 spaces
kind: Deployment                 # 0 spaces
metadata:                        # 0 spaces
  name: myapp                    # 2 spaces
spec:                            # 0 spaces
  replicas: 1                    # 2 spaces
  selector:                      # 2 spaces
    matchLabels:                 # 4 spaces
      app: myapp                 # 6 spaces
  template:                      # 2 spaces
    metadata:                    # 4 spaces
      labels:                    # 6 spaces
        app: myapp               # 8 spaces
    spec:                        # 4 spaces
      containers:                # 6 spaces
      - name: myapp              # 8 spaces (list item)
        image: myapp:latest      # 10 spaces
        ports:                   # 10 spaces
        - containerPort: 8080    # 12 spaces (list item)
        env:                     # 10 spaces
        - name: ENV_VAR          # 12 spaces (list item)
          value: "value"         # 14 spaces
```

---

## Best Practices

### ✅ DO
- Use **2 spaces** for each indentation level (not tabs)
- Keep all properties of same element at same indentation
- Use IDE with YAML support (auto-formats)
- Validate YAML before committing
- Use consistent formatting across files

### ❌ DON'T
- Mix spaces and tabs
- Use inconsistent indentation
- Don't trust visual alignment (use spaces)
- Don't manually format complex YAML
- Don't assume YAML is correct without validation

---

## Real Example: Our Backend Deployment

### ❌ BEFORE (Wrong)
```yaml
27:    strategy:
28:      type: RollingUpdate
...
71:         resources:           # 9 spaces (wrong)
72:           requests:
...
78:          livenessProbe:      # 10 spaces (wrong)
79:            httpGet:
```

### ✅ AFTER (Correct)
```yaml
27:  strategy:
28:    type: RollingUpdate
...
71:        resources:            # 8 spaces (correct)
72:          requests:
...
78:        livenessProbe:        # 8 spaces (correct)
79:          httpGet:
```

---

## Debugging YAML Errors

### Error: "did not find expected key"
- Usually means indentation is wrong
- Check that all properties at same level have same indentation
- Use yamllint to find exact location

### Error: "mapping values are not allowed here"
- Colon syntax error (missing space after colon)
- Example: `key:value` should be `key: value`

### Error: "block sequence entries are not allowed"
- Dash placement wrong
- List items must have dash at correct indentation

### Error: "duplicate key"
- Two properties have the same name
- Usually indentation caused duplication

---

## Quick Checklist

Before committing YAML files:

- [ ] File passes `yamllint` validation
- [ ] All properties at same level have same indentation
- [ ] Using 2 spaces per indentation (not tabs)
- [ ] No trailing whitespace
- [ ] Colons have space after them: `key: value`
- [ ] List items start with dash: `- item`
- [ ] Tested with `kubectl apply --dry-run`

---

## Resources

- [YAML Spec](https://yaml.org/spec/1.2/spec.html)
- [Kubernetes YAML Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [yamllint Documentation](https://www.yamllint.com/)

---

## Summary

✅ **Fixed**: Backend deployment indentation  
✅ **Validated**: All Kubernetes manifests  
✅ **Committed**: Changes pushed to Git  
✅ **Ready**: ArgoCD can now generate manifests  

Your YAML is now valid and production-ready! 🎉
