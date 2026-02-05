#include <vector>

class Solution {
public:
  void merge(std::vector<int> &nums1, int m, std::vector<int> &nums2, int n) {
    // use three pointers
    int i = m - 1;     // last element of nums1's initial data
    int j = n - 1;     // last element of nums2
    int k = m + n - 1; // last position in nums1's total space

    // merge from back to front to avoid overwriting unprocessed elements
    while (i >= 0 && j >= 0) {
      if (nums1[i] > nums2[j]) {
        nums1[k--] = nums1[i--];
      } else {
        nums1[k--] = nums2[j--];
      }
    }

    // if nums2 still has elements, copy them
    // (if nums1 has remaining elements, they're already in place)
    while (j >= 0) {
      nums1[k--] = nums2[j--];
    }
  }
};
