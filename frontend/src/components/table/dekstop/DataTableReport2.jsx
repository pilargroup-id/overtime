import DataTableReport from "./DataTableReport";


const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];
const DEFAULT_SORT_COLUMN = "id";
const TABLE_MODES = {
  DEFAULT: "default",
  PAGINATION: "pagination",
  INFINITE_SCROLL: "infinite-scroll",
};

function noopReport() {
    if (Array.isArray(arguments[0])) {
        return arguments[0].map((item) => ({
            ...item,
            id: item.id || item._id || Math.random().toString(36).substr(2, 9),
        }));
    }
}

function formatSubmittedData(data) {
    const submittedByFields = [
        'submittedBy.name',
        'submittedBy.email',
        'submittedBy.department',
        'submittedBy.jobLevel',
        'submittedBy.id',
    ];

    return data.map((item) => {
        const formattedItem = { ...item };
        submittedByFields.forEach((field) => {
            const [parent, child] = field.split('.');
            if (formattedItem[parent] && formattedItem[parent][child] !== undefined) {
                formattedItem[field] = formattedItem[parent][child];
            }
        });
        return formattedItem;
    });
}

function DataTableReport2(props) {
    const {
        data = [],
        columns = [],
        pageSize = DEFAULT_PAGE_SIZE,
        pageSizeOptions = PAGE_SIZE_OPTIONS,
        sortColumn = DEFAULT_SORT_COLUMN,
        tableMode = TABLE_MODES.DEFAULT,
        onRowClick = () => {},
        onPageChange = () => {},
        onSortChange = () => {},
    } = props;

    const formattedData = formatSubmittedData(data);
    const handleOpenDialogReport = (rowData) => {
        onRowClick(rowData);
    }

    const handleEditedData = (editedData) => {
        onPageChange(editedData);
    }

    const handleDeleteData = (deletedData) => {
        onPageChange(deletedData);
    }

    const handleSortChange = (sortColumn) => {
        onSortChange(sortColumn);
    }

    const safeCurrentPage = (currentPage, totalPages)
    const firstItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const lastItem = Math.min(currentPage * pageSize, totalItems);

    // const pagination = useMemo(() => {
    //     if (tableMode === TABLE_MODES.PAGINATION) {
    //         return (
    //             <Pagination
    //                 currentPage={currentPage}
    //                 totalPages={totalPages}
    //                 onPageChange={handlePageChange}
    //             />
    //         )
    //     }}