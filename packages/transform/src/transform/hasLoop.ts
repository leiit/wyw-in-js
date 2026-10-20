type LoopNode = {
  name: string;
  parents: readonly LoopNode[];
};

export function hasLoop(name: string, parent: LoopNode): boolean {
  const onPath = new Set<string>();
  const explored = new Set<string>();

  const visit = (node: LoopNode): boolean => {
    if (node.name === name || onPath.has(node.name)) {
      return true;
    }

    if (explored.has(node.name)) {
      return false;
    }

    onPath.add(node.name);
    for (const candidate of node.parents) {
      if (visit(candidate)) {
        return true;
      }
    }

    onPath.delete(node.name);
    explored.add(node.name);
    return false;
  };

  return visit(parent);
}
