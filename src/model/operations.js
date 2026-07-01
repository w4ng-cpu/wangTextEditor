import { getNodeAtPath, setNodeAtPath } from "./utils.js";

export function applyOperation(doc, op) {
  switch (op.type) {
    case "insert_text": {
      // 1. Find the text node at op.path
      // 2. Splice op.text into node.text at op.offset
      // 3. Return a new doc with that node replaced
      const node = getNodeAtPath(doc, op.path);

      const newNode = {
        ...node,
        text:
          node.text.slice(0, op.offset) + op.text + node.text.slice(op.offset),
      };
      return setNodeAtPath(doc, op.path, newNode);
    }

    case "remove_text": {
      // Opposite of insert — cut op.text.length characters starting at op.offset
      const node = getNodeAtPath(doc, op.path);
      const newNode = {
        ...node,
        text:
          node.text.slice(0, op.offset) +
          node.text.slice(op.offset + op.text.length),
      };

      return setNodeAtPath(doc, op.path, newNode);
    }

    case "set_node": {
      // Merge newProps onto the existing node — shallow merge is enough
      const node = getNodeAtPath(doc, op.path);
      const newNode = { ...node, ...op.newProps };
      return setNodeAtPath(doc, op.path, newNode);
    }

    case "insert_node": {
      // Insert op.node into the children array at the index given by the last
      // element of op.path. The parent path is everything except the last index.
      const parentPath = op.path.slice(0, -1);
      const index = op.path[op.path.length - 1];
      const parent = getNodeAtPath(doc, parentPath);
      const newChildren = [...parent.children];
      newChildren.splice(index, 0, op.node);
      return setNodeAtPath(doc, parentPath, {
        ...parent,
        children: newChildren,
      });
    }

    case "remove_node": {
      // Remove the node at the index given by the last element of op.path
      const parentPath = op.path.slice(0, -1);
      const index = op.path[op.path.length - 1];
      const parent = getNodeAtPath(doc, parentPath);
      const newChildren = [...parent.children];
      newChildren.splice(index, 1);
      return setNodeAtPath(doc, parentPath, {
        ...parent,
        children: newChildren,
      });
    }

    case "split_node": {
      // Split the node at op.path into two nodes at op.position.
      // The node stays in place; a new node is inserted after it.
      // For text nodes: split the text string.
      // For block nodes: split the children array.
      const node = getNodeAtPath(doc, op.path);
      const parentPath = op.path.slice(0, -1);
      const index = op.path[op.path.length - 1];
      const parent = getNodeAtPath(doc, parentPath);

      let nodeA, nodeB;
      if (node.type === "text") {
        nodeA = { ...node, text: node.text.slice(0, op.position) };
        nodeB = { ...node, text: node.text.slice(op.position) };
      } else {
        nodeA = { ...node, children: node.children.slice(0, op.position) };
        nodeB = { ...node, children: node.children.slice(op.position) };
      }

      const newChildren = [...parent.children];
      newChildren.splice(index, 1, nodeA, nodeB);
      return setNodeAtPath(doc, parentPath, {
        ...parent,
        children: newChildren,
      });
    }

    case "merge_node": {
      // Merge the node at op.path into the node directly before it.
      // Both must be the same type.
      const index = op.path[op.path.length - 1];
      const parentPath = op.path.slice(0, -1);
      const parent = getNodeAtPath(doc, parentPath);
      const prev = parent.children[index - 1];
      const curr = parent.children[index];

      let merged;
      if (curr.type === "text") {
        merged = { ...prev, text: prev.text + curr.text };
      } else {
        merged = { ...prev, children: [...prev.children, ...curr.children] };
      }

      const newChildren = [...parent.children];
      newChildren.splice(index - 1, 2, merged);
      return setNodeAtPath(doc, parentPath, {
        ...parent,
        children: newChildren,
      });
    }

    default:
      throw new Error(`applyOperation: unknown operation type "${op.type}"`);
  }
}

export function invertOperation(op) {
  switch (op.type) {
    case "insert_text":
      // Undo inserting text = remove that same text
      return {
        type: "remove_text",
        path: op.path,
        offset: op.offset,
        text: op.text,
      };

    case "remove_text":
      // Undo removing text = insert it back
      return {
        type: "insert_text",
        path: op.path,
        offset: op.offset,
        text: op.text,
      };

    case "set_node":
      // Undo set_node requires knowing the old props — store them when you create the op
      // For now this is a placeholder; transforms.js will supply oldProps
      return { type: "set_node", path: op.path, newProps: op.oldProps ?? {} };

    case "insert_node":
      // Undo inserting a node = remove it — store the node so we can put it back on redo
      return { type: "remove_node", path: op.path, node: op.node };

    case "remove_node":
      // Undo removing a node = insert it back at the same path
      return { type: "insert_node", path: op.path, node: op.node };

    case "split_node": {
      // After the split, nodeA stays at op.path and nodeB lands at index+1.
      // To undo, we merge nodeB (at index+1) back into nodeA.
      const splitIndex = op.path[op.path.length - 1];
      const mergeTargetPath = [...op.path.slice(0, -1), splitIndex + 1];
      return {
        type: "merge_node",
        path: mergeTargetPath,
        position: op.position,
      };
    }

    case "merge_node": {
      // After the merge, the result lands at index-1 (where prev was).
      // To undo, we split that node at the join point.
      const mergeIndex = op.path[op.path.length - 1];
      const splitTargetPath = [...op.path.slice(0, -1), mergeIndex - 1];
      return {
        type: "split_node",
        path: splitTargetPath,
        position: op.position,
      };
    }

    default:
      throw new Error(`invertOperation: unknown operation type "${op.type}"`);
  }
}
