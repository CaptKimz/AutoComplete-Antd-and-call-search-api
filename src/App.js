import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import './style.css';
import 'antd/dist/antd.css';
import { Spin, AutoComplete, Button } from 'antd';
import debounce from 'lodash/debounce';
const DebounceSelect = forwardRef(function DebounceSelect(
  { fetchOptions, debounceTimeout = 800, ...props },
  ref
) {
  const [fetching, setFetching] = useState(false);
  const [allOptions, setAllOptions] = useState([]);
  const [searchValue, setSearchValue] = useState(''); // Maintain search value
  const [currentPage, setCurrentPage] = useState(1); // Maintain current page
  const fetchRef = useRef(0);
  const debounceFetcher = useMemo(() => {
    const loadOptions = (value, page) => {
      fetchRef.current += 1;
      const fetchId = fetchRef.current;
      setFetching(true);
      fetchOptions(value, page).then((newOptions) => {
        if (fetchId !== fetchRef.current) {
          // for fetch callback order
          return;
        }

        setAllOptions((prevOptions) => [...prevOptions, ...newOptions]);
        setFetching(false);
      });
    };

    return debounce(loadOptions, debounceTimeout);
  }, [debounceTimeout]);

  useImperativeHandle(ref, () => ({
    debounceFetcher: (searchValue, nextPage) =>
      debounceFetcher(searchValue, nextPage),
  }));

  const handlePopupScroll = (e) => {
    var target = e.target;
    if (
      !fetching &&
      target.scrollTop + target.offsetHeight === target.scrollHeight
    ) {
      setFetching(true);
      // User has scrolled to the end, load more data
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      debounceFetcher(searchValue, nextPage); // Call fetcher with the search value and new page number
    }
  };
  return (
    <>
      <AutoComplete
        labelInValue
        filterOption={false}
        onSearch={(value) => {
          setSearchValue(value);
          setAllOptions([]); // Reset allOptions when searching
          setCurrentPage(1); // Reset page to 1 when searching
          debounceFetcher(value, 1); // Pass currentPage as 1
        }}
        // notFoundContent={fetching ? <Spin size="small" /> : null}
        loadOptions
        onPopupScroll={handlePopupScroll}
        {...props}
        options={allOptions}
        dropdownRender={(menu) => {
          return <Spin spinning={fetching}>{menu}</Spin>;
        }}
      />
    </>
  );
});
async function fetchUserList(username, page) {
  return fetch(
    `https://ws-public.interpol.int/notices/v1/red?forename=${username}&resultPerPage=20&page=${page}`
  )
    .then((response) => response.json())
    .then((body) => {
      console.log(body);

      return body._embedded.notices.map((user) => ({
        label: `${user.forename} ${user.name}`,
        title: user.entity_id,
        value: `${user.forename} ${user.name}`,
      }));
    });
}
export default function App() {
  const [value, setValue] = useState('');
  const handleSelectChange = (newValue) => {
    setValue(newValue);
  };
  const fetchDataRef = useRef(null);
  useEffect(() => {
    setValue('ELISA');
    fetchDataRef.current.debounceFetcher('ELISA', 1);
  }, []);
  return (
    <>
      <DebounceSelect
        ref={fetchDataRef}
        value={value}
        placeholder="Select users"
        fetchOptions={fetchUserList}
        onChange={handleSelectChange}
        style={{
          width: '100%',
        }}
      />
    </>
  );
}
