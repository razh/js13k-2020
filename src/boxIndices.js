// Vertices.
// pz-nz order is reversed for the nx side.
export var px_py_pz = [0];
export var px_py_nz = [1];
export var px_ny_pz = [2];
export var px_ny_nz = [3];
export var nx_py_nz = [4];
export var nx_py_pz = [5];
export var nx_ny_nz = [6];
export var nx_ny_pz = [7];

// Edges.
export var px_py = [0, 1];
export var px_ny = [2, 3];
export var nx_py = [4, 5];
export var nx_ny = [6, 7];

export var px_pz = [0, 2];
export var px_nz = [1, 3];
export var nx_nz = [4, 6];
export var nx_pz = [5, 7];

export var py_pz = [0, 5];
export var py_nz = [1, 4];
export var ny_pz = [2, 7];
export var ny_nz = [3, 6];

// Faces.
export var px = [0, 1, 2, 3];
export var nx = [4, 5, 6, 7];
export var py = [0, 1, 4, 5];
export var ny = [2, 3, 6, 7];
export var pz = [0, 2, 5, 7];
export var nz = [1, 3, 4, 6];

// All vertices.
export var all = [0, 1, 2, 3, 4, 5, 6, 7];
